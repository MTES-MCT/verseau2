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

const STORAGE_KEY = 'verseau_session';
const STATE_KEY = 'oidc_state';
const NONCE_KEY = 'oidc_nonce';
const REFRESH_LOCK_NAME = 'verseau-auth-refresh';
const REFRESH_MARGIN_MS = 2 * 60 * 1000;
const MIN_REFRESH_MARGIN_MS = 5 * 1000;
const SHORT_LIVED_REFRESH_RATIO = 0.2;
const REFRESH_TIMEOUT_MS = 15 * 1000;
const BACKGROUND_RETRY_DELAYS_MS = [5_000, 15_000, 30_000];
const MAX_BACKGROUND_RETRY_DELAY_MS = 60_000;
const MIN_REFRESH_INTERVAL_MS = 1_000;
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

export class SessionExpiredError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Session refresh rejected with status ${status}`);
    this.name = 'SessionExpiredError';
    this.status = status;
  }
}

class RefreshTimeoutError extends Error {
  constructor() {
    super('Token refresh timed out');
    this.name = 'RefreshTimeoutError';
  }
}

class RefreshCancelledError extends Error {
  constructor(message = 'Token refresh cancelled because the session changed') {
    super(message);
    this.name = 'RefreshCancelledError';
  }
}

class AuthService {
  private storage: Storage;
  private sessionStorage: Storage;
  private refreshPromise: Promise<void> | null = null;
  private refreshAbortController: AbortController | null = null;
  private logoutAbortController: AbortController | null = null;
  private refreshTimer: number | null = null;
  private backgroundRetryCount = 0;
  private backgroundFailureReported = false;
  private lifecycleSubscribers = 0;
  private sessionGeneration = 0;
  private readonly sessionListeners = new Set<() => void>();

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

    await this.runWithSessionLock(async () => {
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
    });
  }

  async logout(): Promise<void> {
    const pendingRefresh = this.refreshPromise;
    this.clearSession();
    if (pendingRefresh) {
      await pendingRefresh.catch(() => undefined);
    }

    await this.runWithSessionLock(async () => {
      this.clearSession();
      const controller = new AbortController();
      this.logoutAbortController = controller;
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        });
      } catch {
        // Best-effort: local state was cleared before the request.
      } finally {
        if (this.logoutAbortController === controller) {
          this.logoutAbortController = null;
        }
      }
    });
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

    if (!this.isOnline()) {
      return null;
    }

    try {
      await this.refreshToken();
      return 'cookie-stored';
    } catch {
      const currentSession = this.getSession();
      if (!currentSession || currentSession.expires_at <= Date.now()) {
        return null;
      }
      return 'cookie-stored';
    }
  }

  refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshPromise = this.doRefreshToken()
      .then(() => {
        this.resetBackgroundRetries();
        this.scheduleRefresh();
      })
      .catch((error: unknown) => {
        this.scheduleRetryAfterFailure(error);
        throw error;
      })
      .finally(() => {
        if (this.refreshPromise === refreshPromise) {
          this.refreshPromise = null;
        }
      });
    this.refreshPromise = refreshPromise;
    return refreshPromise;
  }

  private async doRefreshToken(): Promise<void> {
    const sessionBeforeLock = this.getSession();
    const controller = new AbortController();
    this.refreshAbortController = controller;
    const timeout = window.setTimeout(() => controller.abort(new RefreshTimeoutError()), REFRESH_TIMEOUT_MS);

    const refreshWithLock = async () => {
      const currentSession = this.getSession();
      if (this.wasRenewedSince(currentSession, sessionBeforeLock)) {
        return;
      }

      if (sessionBeforeLock && !currentSession) {
        throw new Error('Session was cleared before refresh');
      }

      const sessionIdentityBeforeFetch = this.getSessionSnapshot();
      const generationBeforeFetch = this.sessionGeneration;
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        this.sessionGeneration !== generationBeforeFetch ||
        this.getSessionSnapshot() !== sessionIdentityBeforeFetch
      ) {
        throw new RefreshCancelledError();
      }

      if (!response.ok) {
        if ([400, 401, 403].includes(response.status)) {
          const error = new SessionExpiredError(response.status);
          this.invalidateSession(error);
          throw error;
        }
        throw new Error(`Failed to refresh token with status ${response.status}`);
      }

      const data: RefreshResponse = await response.json();
      if (
        controller.signal.aborted ||
        this.sessionGeneration !== generationBeforeFetch ||
        this.getSessionSnapshot() !== sessionIdentityBeforeFetch
      ) {
        throw new RefreshCancelledError();
      }
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
        throw controller.signal.reason instanceof Error ? controller.signal.reason : new RefreshCancelledError();
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
      await this.refreshToken();
      const sessionBeforeRetry = this.getSessionSnapshot();
      const retryResponse = await this.fetchCurrentUser();

      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          this.clearSessionIfCurrent(sessionBeforeRetry);
          throw new SessionExpiredError(401);
        }
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
    this.sessionGeneration += 1;
    this.refreshAbortController?.abort(new RefreshCancelledError());
    if (event.newValue) {
      this.logoutAbortController?.abort(new RefreshCancelledError('Logout cancelled because the session changed'));
    }
    this.emitSessionChange();
    this.resetBackgroundRetries();
    this.scheduleRefresh();
  };

  private scheduleRefresh(retryDelay?: number): void {
    this.clearRefreshTimer();
    if (this.lifecycleSubscribers === 0 || !this.isPageActive()) {
      return;
    }

    const session = this.getSession();
    if (!session) {
      return;
    }

    const refreshAt = session.refresh_at ?? this.calculateRefreshAt(session.expires_at, Date.now());
    const delay = retryDelay ?? Math.max(0, refreshAt - Date.now());
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      this.runBackgroundRefresh();
    }, delay);
  }

  private runBackgroundRefresh(): void {
    if (!this.isPageActive() || this.refreshPromise) {
      return;
    }

    void this.refreshToken().catch(() => undefined);
  }

  private isRefreshDue(session: SessionStorage): boolean {
    const refreshAt = session.refresh_at ?? this.calculateRefreshAt(session.expires_at, Date.now());
    return refreshAt <= Date.now();
  }

  private isPageActive(): boolean {
    const isVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    return isVisible && this.isOnline();
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  private calculateRefreshAt(expiresAt: number, issuedAt: number): number {
    const lifetime = Math.max(0, expiresAt - issuedAt);
    const margin = Math.min(
      REFRESH_MARGIN_MS,
      Math.max(MIN_REFRESH_MARGIN_MS, lifetime * SHORT_LIVED_REFRESH_RATIO),
      lifetime * 0.5,
    );
    return Math.max(issuedAt + MIN_REFRESH_INTERVAL_MS, expiresAt - margin);
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
      this.logoutAbortController?.abort(new RefreshCancelledError('Logout cancelled because a new session was stored'));
      this.storage.setItem(STORAGE_KEY, JSON.stringify(session));
      this.sessionGeneration += 1;
      this.emitSessionChange();
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

  private resetBackgroundRetries(): void {
    this.backgroundRetryCount = 0;
    this.backgroundFailureReported = false;
  }

  private scheduleRetryAfterFailure(error: unknown): void {
    if (error instanceof SessionExpiredError || error instanceof RefreshCancelledError || !this.getSession()) {
      return;
    }

    const retryDelay = BACKGROUND_RETRY_DELAYS_MS[this.backgroundRetryCount] ?? MAX_BACKGROUND_RETRY_DELAY_MS;
    this.backgroundRetryCount += 1;
    if (this.backgroundRetryCount > BACKGROUND_RETRY_DELAYS_MS.length && !this.backgroundFailureReported) {
      this.backgroundFailureReported = true;
      reportError(error, { source: 'AuthService.refreshToken', retryDelay });
    }
    this.scheduleRefresh(retryDelay);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private runWithSessionLock<T>(callback: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(REFRESH_LOCK_NAME, callback).then((result) => result);
    }
    return callback();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.sessionListeners.add(listener);
    return () => {
      this.sessionListeners.delete(listener);
    };
  };

  getSessionSnapshot = (): string | null => {
    try {
      return this.storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };

  private emitSessionChange(): void {
    this.sessionListeners.forEach((listener) => listener());
  }

  private invalidateSession(reason: Error): void {
    this.clearRefreshTimer();
    this.sessionGeneration += 1;
    this.refreshAbortController?.abort(reason);
    this.refreshAbortController = null;
    this.resetBackgroundRetries();

    try {
      this.storage.removeItem(STORAGE_KEY);
      this.storage.removeItem('oidc_tokens');
      this.emitSessionChange();
    } catch (error) {
      reportError(error, { source: 'AuthService.clearSession' });
    }
  }

  clearSession(): void {
    this.invalidateSession(new RefreshCancelledError('Token refresh cancelled because the session was cleared'));
  }

  clearSessionIfCurrent(sessionSnapshot: string | null): void {
    if (this.getSessionSnapshot() === sessionSnapshot) {
      this.clearSession();
    }
  }
}

export const authService = new AuthService();
