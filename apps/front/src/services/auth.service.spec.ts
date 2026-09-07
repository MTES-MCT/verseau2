import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRefreshState } from './auth.service';

const STORAGE_KEY = 'verseau_session';
const NOW = new Date('2026-09-07T10:00:00.000Z');

describe('authService refresh lifecycle', () => {
  let stopLifecycle: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
  });

  afterEach(() => {
    stopLifecycle?.();
    stopLifecycle = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function loadAuthService() {
    const mod = await import('./auth.service');
    return mod.authService;
  }

  function storeSession(expiresInMs: number, refreshInMs?: number, updatedAt = Date.now()) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expires_at: Date.now() + expiresInMs,
        refresh_at: refreshInMs === undefined ? undefined : Date.now() + refreshInMs,
        updated_at: updatedAt,
      }),
    );
  }

  const refreshResponse = (expiresIn = 3600) => Response.json({ expiresIn });
  const unauthorizedResponse = () => new Response('Unauthorized', { status: 401 });

  it('deduplicates concurrent silent refreshes without activating reconnection', async () => {
    const authService = await loadAuthService();
    const states: AuthRefreshState[] = [];
    authService.subscribeToRefreshState((state) => states.push(state));

    let resolveRefresh!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const promises = [authService.refreshToken(), authService.refreshToken(), authService.refreshToken()];

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).toEqual(['idle']);

    resolveRefresh(refreshResponse());
    await Promise.all(promises);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authService.getRefreshState()).toBe('idle');
  });

  it('activates reconnection for a 401 and clears it as soon as refresh succeeds', async () => {
    const authService = await loadAuthService();
    let resolveRefresh!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const refresh = authService.refreshAfterUnauthorized();
    expect(authService.getRefreshState()).toBe('reconnecting');

    resolveRefresh(refreshResponse());
    await refresh;

    expect(authService.getRefreshState()).toBe('idle');
  });

  it('lets a 401 join an existing silent refresh without a duplicate request', async () => {
    const authService = await loadAuthService();
    let resolveRefresh!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const silentRefresh = authService.refreshToken();
    const blockingRefresh = authService.refreshAfterUnauthorized();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authService.getRefreshState()).toBe('reconnecting');

    resolveRefresh(refreshResponse());
    await Promise.all([silentRefresh, blockingRefresh]);

    expect(authService.getRefreshState()).toBe('idle');
  });

  it('keeps reconnection active for every caller waiting on the shared refresh', async () => {
    const authService = await loadAuthService();
    let resolveRefresh!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const first = authService.refreshAfterUnauthorized();
    const second = authService.refreshAfterUnauthorized();
    await Promise.resolve();

    expect(authService.getRefreshState()).toBe('reconnecting');
    expect(fetch).toHaveBeenCalledTimes(1);

    resolveRefresh(refreshResponse());
    await Promise.all([first, second]);

    expect(authService.getRefreshState()).toBe('idle');
  });

  it('clears reconnection and exposes a recoverable failure', async () => {
    const authService = await loadAuthService();
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

    await expect(authService.refreshAfterUnauthorized()).rejects.toThrow('Failed to refresh token');

    expect(authService.getRefreshState()).toBe('failed');
  });

  it('bounds a blocking refresh and clears the loading state on timeout', async () => {
    const authService = await loadAuthService();
    vi.mocked(fetch).mockImplementation((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    const refresh = authService.refreshAfterUnauthorized();
    const rejection = expect(refresh).rejects.toThrow('Token refresh timed out');
    expect(authService.getRefreshState()).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;

    expect(authService.getRefreshState()).toBe('failed');
  });

  it('returns a still-valid token immediately while starting a due silent refresh', async () => {
    const authService = await loadAuthService();
    storeSession(30_000, -1);
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => undefined));

    await expect(authService.getAccessToken()).resolves.toBe('cookie-stored');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authService.getRefreshState()).toBe('idle');
  });

  it('uses the silent restoration flow for locally expired metadata', async () => {
    const authService = await loadAuthService();
    storeSession(-1_000, -2_000);
    vi.mocked(fetch).mockResolvedValueOnce(refreshResponse());

    await expect(authService.getAccessToken()).resolves.toBe('cookie-stored');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authService.getRefreshState()).toBe('idle');
  });

  it('schedules long-lived sessions two minutes before expiration', async () => {
    const authService = await loadAuthService();
    storeSession(60 * 60 * 1000);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();

    await vi.advanceTimersByTimeAsync(58 * 60 * 1000 - 1);
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reduces the refresh margin for short-lived tokens', async () => {
    const authService = await loadAuthService();
    storeSession(60_000);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();

    await vi.advanceTimersByTimeAsync(48_000 - 1);
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('pauses scheduling while hidden and rechecks when the tab becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    const authService = await loadAuthService();
    storeSession(60_000, 0);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rechecks a due refresh when the window regains focus', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    const authService = await loadAuthService();
    storeSession(60_000, 0);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rechecks a due refresh when network connectivity returns', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const authService = await loadAuthService();
    storeSession(60_000, 0);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('cleans up scheduled refreshes when the lifecycle stops', async () => {
    const authService = await loadAuthService();
    storeSession(60_000, 10_000);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();
    stopLifecycle();
    stopLifecycle = undefined;

    await vi.advanceTimersByTimeAsync(20_000);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses bounded backoff after silent refresh failures while the JWT is valid', async () => {
    const authService = await loadAuthService();
    storeSession(10 * 60 * 1000, 0);
    vi.mocked(fetch).mockResolvedValue(new Response('Unavailable', { status: 503 }));
    stopLifecycle = authService.startLifecycle();

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(15_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getRefreshState()).toBe('idle');
  });

  it('does not continue silent retries after a 401 joined and the shared refresh failed', async () => {
    const authService = await loadAuthService();
    storeSession(10 * 60 * 1000, 0);
    let rejectRefresh!: (reason: Error) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((_resolve, reject) => {
        rejectRefresh = reject;
      }),
    );
    stopLifecycle = authService.startLifecycle();
    await vi.advanceTimersByTimeAsync(0);

    const blockingRefresh = authService.refreshAfterUnauthorized();
    const rejection = expect(blockingRefresh).rejects.toThrow('shared failure');
    rejectRefresh(new Error('shared failure'));
    await rejection;
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authService.getRefreshState()).toBe('failed');
  });

  it('skips a duplicate refresh when another tab renews the session under the Web Lock', async () => {
    storeSession(60_000, 0);
    const previousSession = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { updated_at: number };
    const request = vi.fn(
      async (_name: string, _options: LockOptions, callback: (lock: Lock | null) => Promise<void>) => {
        storeSession(60 * 60 * 1000, 58 * 60 * 1000, previousSession.updated_at + 1);
        return callback({ name: 'verseau-auth-refresh', mode: 'exclusive' } as Lock);
      },
    );
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    const authService = await loadAuthService();

    await authService.refreshToken();

    expect(request).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reschedules when another tab updates session metadata', async () => {
    const authService = await loadAuthService();
    storeSession(60_000, 10_000);
    vi.mocked(fetch).mockResolvedValue(refreshResponse());
    stopLifecycle = authService.startLifecycle();

    storeSession(120_000, 70_000, Date.now() + 1);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: localStorage.getItem(STORAGE_KEY),
      }),
    );

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses blocking refresh for /auth/me 401 and retries that request once', async () => {
    const authService = await loadAuthService();
    const user = { user: { cerbereId: 'user-1' }, intervenant: null, isExpertNational: false };
    vi.mocked(fetch)
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockResolvedValueOnce(refreshResponse())
      .mockResolvedValueOnce(Response.json(user));

    await expect(authService.getCurrentUser()).resolves.toEqual(user);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(authService.getRefreshState()).toBe('idle');
  });

  it('does not recursively refresh when the /auth/me retry also returns 401', async () => {
    const authService = await loadAuthService();
    vi.mocked(fetch)
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockResolvedValueOnce(refreshResponse())
      .mockResolvedValueOnce(unauthorizedResponse());

    await expect(authService.getCurrentUser()).rejects.toThrow('Failed to get user info after session renewal');

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
