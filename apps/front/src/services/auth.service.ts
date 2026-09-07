import { API_BASE_URL } from '../appConfig';
import { reportError } from '../monitoring/sentry';
import type { AuthenticatedUser, AuthenticatedUserWithIntervenant } from '../types/auth.types';

/** Only token timing metadata lives in localStorage. The tokens stay in httpOnly cookies. */
interface SessionStorage {
  expires_at: number;
  refresh_at?: number;
  updated_at?: number;
}

interface AuthCallbackResponse {
  expiresIn?: number;
  user: AuthenticatedUser;
}

interface RefreshResponse {
  expiresIn?: number;
}

interface OIDCConfiguration {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

export type AuthRefreshState = 'idle' | 'reconnecting' | 'failed';

const STORAGE_KEY = 'verseau_session';
const STATE_KEY = 'oidc_state';
const NONCE_KEY = 'oidc_nonce';
const REFRESH_LOCK_NAME = 'verseau-auth-refresh';
const REFRESH_MARGIN_MS = 2 * 60 * 1000;
const MIN_REFRESH_MARGIN_MS = 5 * 1000;
const SHORT_LIVED_REFRESH_RATIO = 0.2;
const REFRESH_TIMEOUT_MS = 15 * 1000;
const BACKGROUND_RETRY_DELAYS_MS = [5_000, 15_000, 30_000];
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

class AuthService {
  private storage: Storage;
  private sessionStorage: Storage;
  private refreshPromise: Promise<void> | null = null;
  private refreshOperationId: symbol | null = null;
  private refreshAbortController: AbortController | null = null;
  private refreshState: AuthRefreshState = 'idle';
  private refreshStateListeners = new Set<(state: AuthRefreshState) => void>();
  private blockingRefreshRequested = false;
  private reconnectionPaintPromise: Promise<void> | null = null;
  private refreshTimer: number | null = null;
  private backgroundRetryCount = 0;
  private backgroundRetryAt: number | null = null;
  private lifecycleSubscribers = 0;

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
    this.sessionStorage = typeof window !== 'undefined' ? window.sessionStorage : ({} as Storage);
  }

  private generateRandomValue(): string {
    return crypto.randomUUID();
  }

  async login(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get OIDC configuration');
    }

    const config: OIDCConfiguration = await response.json();
    const state = this.generateRandomValue();
    const nonce = this.generateRandomValue();

    this.sessionStorage.setItem(STATE_KEY, state);
    this.sessionStorage.setItem(NONCE_KEY, nonce);

    const authUrl = new URL(config.authorizationEndpoint);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('scope', config.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    window.location.href = authUrl.toString();
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const expectedState = this.sessionStorage.getItem(STATE_KEY);
    const expectedNonce = this.sessionStorage.getItem(NONCE_KEY);

    this.sessionStorage.removeItem(STATE_KEY);
    this.sessionStorage.removeItem(NONCE_KEY);

    if (!expectedState || state !== expectedState) {
      throw new Error(
        'La vérification de sécurité de la connexion a échoué. Votre demande de connexion a peut-être expiré ou a été ouverte dans un autre onglet. Veuillez réessayer.',
      );
    }

    if (!expectedNonce) {
      throw new Error('Missing nonce');
    }

    const response = await fetch(`${API_BASE_URL}/auth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        nonce: expectedNonce,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed: ${error}`);
    }

    const data: AuthCallbackResponse = await response.json();
    this.storeSession(data.expiresIn);
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort: even if the request fails, clear local state below.
    } finally {
      this.clearSession();
    }
  }

  /**
   * Restore the cookie-backed session. A still-valid JWT is immediately usable;
   * only an already-expired JWT blocks restoration while a silent refresh runs.
   */
  async getAccessToken(): Promise<string | null> {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    if (session.expires_at > Date.now()) {
      if (this.isRefreshDue(session) && this.isPageActive()) {
        this.runBackgroundRefresh();
      }
      return 'cookie-stored';
    }

    try {
      await this.refreshToken();
      return 'cookie-stored';
    } catch {
      const currentSession = this.getSession();
      if (!currentSession || currentSession.expires_at <= Date.now()) {
        this.clearSession();
        return null;
      }
      return 'cookie-stored';
    }
  }

  /** Silent by default. Call refreshAfterUnauthorized() only in direct response to a 401. */
  async refreshToken(): Promise<void> {
    return this.requestRefresh(false);
  }

  async refreshAfterUnauthorized(): Promise<void> {
    return this.requestRefresh(true);
  }

  private requestRefresh(blocking: boolean): Promise<void> {
    if (blocking) {
      this.blockingRefreshRequested = true;
      this.setRefreshState('reconnecting');
      this.reconnectionPaintPromise ??= this.waitForReconnectionPaint();
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const operationId = Symbol('refresh-operation');
    const operation = this.doRefreshToken().then(
      () => this.finishRefresh(operationId, false),
      async (error: unknown) => {
        await this.finishRefresh(operationId, true);
        throw error;
      },
    );
    this.refreshOperationId = operationId;
    this.refreshPromise = operation;
    return operation;
  }

  private async finishRefresh(operationId: symbol, failed: boolean): Promise<void> {
    if (this.blockingRefreshRequested) {
      await this.reconnectionPaintPromise;
    }

    if (this.refreshOperationId !== operationId) {
      return;
    }

    this.refreshPromise = null;
    this.refreshOperationId = null;
    if (this.blockingRefreshRequested) {
      this.setRefreshState(failed ? 'failed' : 'idle');
    }
    this.blockingRefreshRequested = false;
    this.reconnectionPaintPromise = null;
  }

  private waitForReconnectionPaint(): Promise<void> {
    if (
      typeof window.requestAnimationFrame !== 'function' ||
      typeof document === 'undefined' ||
      document.visibilityState === 'hidden' ||
      this.refreshStateListeners.size === 0
    ) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        resolve();
      };
      const timeout = window.setTimeout(finish, 100);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(finish);
      });
    });
  }

  private async doRefreshToken(): Promise<void> {
    const sessionBeforeLock = this.getSession();
    const controller = new AbortController();
    this.refreshAbortController = controller;
    const timeout = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

    const refreshWithLock = async () => {
      const currentSession = this.getSession();
      if (this.wasRenewedSince(currentSession, sessionBeforeLock)) {
        this.scheduleRefresh();
        return;
      }

      if (sessionBeforeLock && !currentSession) {
        throw new Error('Session was cleared before refresh');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data: RefreshResponse = await response.json();
      this.storeSession(data.expiresIn);
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request(REFRESH_LOCK_NAME, { signal: controller.signal }, refreshWithLock);
      } else {
        await refreshWithLock();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Token refresh timed out', { cause: error });
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
      if (this.refreshAbortController === controller) {
        this.refreshAbortController = null;
      }
    }
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session && session.expires_at > Date.now();
  }

  async getCurrentUser(): Promise<AuthenticatedUserWithIntervenant> {
    const response = await this.fetchCurrentUser();

    if (response.status === 401) {
      await this.refreshAfterUnauthorized();
      const retryResponse = await this.fetchCurrentUser();

      if (!retryResponse.ok) {
        throw new Error('Failed to get user info after session renewal');
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  private fetchCurrentUser(): Promise<Response> {
    return fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  getRefreshState(): AuthRefreshState {
    return this.refreshState;
  }

  subscribeToRefreshState(listener: (state: AuthRefreshState) => void): () => void {
    this.refreshStateListeners.add(listener);
    listener(this.refreshState);
    return () => this.refreshStateListeners.delete(listener);
  }

  startLifecycle(): () => void {
    this.lifecycleSubscribers += 1;
    if (this.lifecycleSubscribers === 1) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleActivity);
      window.addEventListener('online', this.handleActivity);
      window.addEventListener('storage', this.handleStorage);
      this.scheduleRefresh();
    }

    let stopped = false;
    return () => {
      if (stopped) {
        return;
      }
      stopped = true;
      this.lifecycleSubscribers -= 1;
      if (this.lifecycleSubscribers === 0) {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('focus', this.handleActivity);
        window.removeEventListener('online', this.handleActivity);
        window.removeEventListener('storage', this.handleStorage);
        this.clearRefreshTimer();
      }
    };
  }

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.clearRefreshTimer();
      return;
    }
    this.resetBackgroundRetries();
    this.scheduleRefresh();
  };

  private readonly handleActivity = () => {
    if (!this.isPageActive()) {
      return;
    }
    this.resetBackgroundRetries();
    this.scheduleRefresh();
  };

  private readonly handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    this.resetBackgroundRetries();
    this.scheduleRefresh();
  };

  private scheduleRefresh(): void {
    this.clearRefreshTimer();
    if (this.lifecycleSubscribers === 0 || !this.isPageActive()) {
      return;
    }

    const session = this.getSession();
    if (!session) {
      return;
    }

    let refreshAt = session.refresh_at ?? this.calculateRefreshAt(session.expires_at, Date.now());
    if (this.backgroundRetryAt !== null) {
      refreshAt = Math.max(refreshAt, this.backgroundRetryAt);
    }

    if (this.backgroundRetryCount > BACKGROUND_RETRY_DELAYS_MS.length && refreshAt <= Date.now()) {
      return;
    }

    const delay = Math.max(0, refreshAt - Date.now());
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      this.runBackgroundRefresh();
    }, delay);
  }

  private runBackgroundRefresh(): void {
    if (!this.isPageActive()) {
      return;
    }

    void this.refreshToken().catch(() => {
      if (this.refreshState === 'failed') {
        return;
      }

      const session = this.getSession();
      if (!session || session.expires_at <= Date.now()) {
        return;
      }

      const retryDelay = BACKGROUND_RETRY_DELAYS_MS[this.backgroundRetryCount];
      this.backgroundRetryCount += 1;
      if (retryDelay === undefined) {
        this.backgroundRetryAt = null;
        return;
      }

      this.backgroundRetryAt = Date.now() + retryDelay;
      this.scheduleRefresh();
    });
  }

  private isRefreshDue(session: SessionStorage): boolean {
    const refreshAt = session.refresh_at ?? this.calculateRefreshAt(session.expires_at, Date.now());
    return refreshAt <= Date.now();
  }

  private isPageActive(): boolean {
    const isVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
    return isVisible && isOnline;
  }

  private calculateRefreshAt(expiresAt: number, issuedAt: number): number {
    const lifetime = Math.max(0, expiresAt - issuedAt);
    const margin = Math.min(REFRESH_MARGIN_MS, Math.max(MIN_REFRESH_MARGIN_MS, lifetime * SHORT_LIVED_REFRESH_RATIO));
    return expiresAt - margin;
  }

  private wasRenewedSince(current: SessionStorage | null, previous: SessionStorage | null): boolean {
    if (!current) {
      return false;
    }
    if (!previous) {
      return current.expires_at > Date.now();
    }
    return (
      current.expires_at > previous.expires_at ||
      (current.updated_at !== undefined && current.updated_at > (previous.updated_at ?? 0))
    );
  }

  private storeSession(expiresIn = DEFAULT_EXPIRES_IN_SECONDS): void {
    const now = Date.now();
    const expiresAt = now + expiresIn * 1000;
    const previousUpdatedAt = this.getSession()?.updated_at ?? 0;
    const session: SessionStorage = {
      expires_at: expiresAt,
      refresh_at: this.calculateRefreshAt(expiresAt, now),
      updated_at: Math.max(now, previousUpdatedAt + 1),
    };

    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(session));
      this.resetBackgroundRetries();
      this.scheduleRefresh();
    } catch (error) {
      reportError(error, { source: 'AuthService.storeSession' });
    }
  }

  private getSession(): SessionStorage | null {
    try {
      const stored = this.storage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }
      const session = JSON.parse(stored) as SessionStorage;
      return typeof session.expires_at === 'number' ? session : null;
    } catch (error) {
      reportError(error, { source: 'AuthService.getSession' });
      return null;
    }
  }

  private setRefreshState(state: AuthRefreshState): void {
    if (this.refreshState === state) {
      return;
    }
    this.refreshState = state;
    this.refreshStateListeners.forEach((listener) => listener(state));
  }

  private resetBackgroundRetries(): void {
    this.backgroundRetryCount = 0;
    this.backgroundRetryAt = null;
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  clearSession(): void {
    this.clearRefreshTimer();
    this.refreshAbortController?.abort();
    this.refreshAbortController = null;
    this.blockingRefreshRequested = false;
    this.reconnectionPaintPromise = null;
    this.setRefreshState('idle');
    this.resetBackgroundRetries();

    try {
      this.storage.removeItem(STORAGE_KEY);
      this.storage.removeItem('oidc_tokens');
    } catch (error) {
      reportError(error, { source: 'AuthService.clearSession' });
    }
  }
}

export const authService = new AuthService();
