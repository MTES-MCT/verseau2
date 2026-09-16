import { authService, type SessionChange } from './auth.service';

const REFRESH_WINDOW_MS = 2 * 60 * 1000;

export interface RefreshAuthServiceAuth {
  refreshToken: () => Promise<number>;
  getSessionExpiresAt: () => number | null;
  subscribeToSessionChanges: (listener: (change: SessionChange) => void) => () => void;
}

export class RefreshAuthService {
  private refreshTimer: number | null = null;
  private lifecycleActive = false;
  private proactiveActive = false;
  private activeRefreshOperation: number | null = null;
  private nextRefreshOperation = 0;
  private unsubscribeFromSessionChanges: (() => void) | null = null;
  private readonly auth: RefreshAuthServiceAuth;

  constructor(auth: RefreshAuthServiceAuth = authService) {
    this.auth = auth;
  }

  start(): void {
    if (!this.lifecycleActive) {
      this.lifecycleActive = true;
      this.unsubscribeFromSessionChanges = this.auth.subscribeToSessionChanges(this.handleSessionChange);

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      }
    }

    this.proactiveActive = true;
    this.scheduleStoredSession(true);
  }

  stop(): void {
    this.lifecycleActive = false;
    this.proactiveActive = false;
    this.activeRefreshOperation = null;
    this.clearRefreshTimer();

    this.unsubscribeFromSessionChanges?.();
    this.unsubscribeFromSessionChanges = null;

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private stopProactiveRefresh(): void {
    this.proactiveActive = false;
    this.activeRefreshOperation = null;
    this.clearRefreshTimer();
  }

  private readonly handleSessionChange = (change: SessionChange): void => {
    if (!this.lifecycleActive) {
      return;
    }

    if (change.type === 'cleared') {
      this.stopProactiveRefresh();
      return;
    }

    if (change.type === 'login') {
      this.proactiveActive = true;
      this.activeRefreshOperation = null;
      this.scheduleSession(change.expiresAt, true);
      return;
    }

    if (!this.proactiveActive || this.activeRefreshOperation !== null) {
      return;
    }

    // A fallback refresh already happened, so only align the next timer here.
    // Refreshing immediately would loop when the fallback returned a short-lived token.
    this.scheduleSession(change.expiresAt, false);
  };

  private readonly handleVisibilityChange = (): void => {
    if (!this.lifecycleActive || !this.proactiveActive || typeof document === 'undefined') {
      return;
    }

    if (document.visibilityState !== 'visible') {
      return;
    }

    this.scheduleStoredSession(true);
  };

  private scheduleStoredSession(refreshIfDue: boolean): void {
    const expiresAt = this.auth.getSessionExpiresAt();
    if (expiresAt === null) {
      this.clearRefreshTimer();
      return;
    }

    this.scheduleSession(expiresAt, refreshIfDue);
  }

  private scheduleSession(expiresAt: number, refreshIfDue: boolean): void {
    this.clearRefreshTimer();

    if (!this.lifecycleActive || !this.proactiveActive || this.activeRefreshOperation !== null) {
      return;
    }

    const delay = expiresAt - Date.now() - REFRESH_WINDOW_MS;
    if (delay <= 0) {
      if (refreshIfDue) {
        this.runProactiveRefresh();
      }
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    this.refreshTimer = window.setTimeout(this.handleTimer, delay);
  }

  private readonly handleTimer = (): void => {
    this.refreshTimer = null;
    this.runProactiveRefresh();
  };

  private runProactiveRefresh(): void {
    if (!this.lifecycleActive || !this.proactiveActive || this.activeRefreshOperation !== null) {
      return;
    }

    const operationId = ++this.nextRefreshOperation;
    this.activeRefreshOperation = operationId;

    let refreshPromise: Promise<number>;
    try {
      refreshPromise = this.auth.refreshToken();
    } catch {
      this.handleRefreshFailure(operationId);
      return;
    }

    void Promise.resolve(refreshPromise).then(
      (status) => this.handleRefreshResult(operationId, status),
      () => this.handleRefreshFailure(operationId),
    );
  }

  private handleRefreshResult(operationId: number, status: number): void {
    if (this.activeRefreshOperation !== operationId || !this.lifecycleActive || !this.proactiveActive) {
      return;
    }

    this.activeRefreshOperation = null;

    if (status !== 201) {
      this.stopProactiveRefresh();
      return;
    }

    const expiresAt = this.auth.getSessionExpiresAt();
    if (expiresAt === null || expiresAt - Date.now() <= REFRESH_WINDOW_MS) {
      // Do not immediately refresh again for a token that cannot outlive the refresh window.
      this.stopProactiveRefresh();
      return;
    }

    this.scheduleSession(expiresAt, false);
  }

  private handleRefreshFailure(operationId: number): void {
    if (this.activeRefreshOperation !== operationId) {
      return;
    }

    this.stopProactiveRefresh();
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer === null) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = null;
  }
}

export const refreshAuthService = new RefreshAuthService();
