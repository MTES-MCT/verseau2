import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionChange } from './auth.service';
import { RefreshAuthService, type RefreshAuthServiceAuth } from './refreshAuth.service';

const MINUTE = 60 * 1000;
const refreshServices: RefreshAuthService[] = [];

function createAuth(initialExpiresAt: number) {
  let expiresAt = initialExpiresAt;
  let sessionListener: ((change: SessionChange) => void) | null = null;
  const refreshToken = vi.fn<RefreshAuthServiceAuth['refreshToken']>(() => Promise.resolve(200));

  const auth = {
    refreshToken,
    getSessionExpiresAt: vi.fn(() => expiresAt),
    subscribeToSessionChanges: vi.fn((listener: (change: SessionChange) => void) => {
      sessionListener = listener;
      return () => {
        if (sessionListener === listener) {
          sessionListener = null;
        }
      };
    }),
  };

  return {
    auth,
    refreshToken,
    setExpiresAt: (value: number) => {
      expiresAt = value;
    },
    emit: (change: SessionChange) => {
      sessionListener?.(change);
    },
  };
}

function setVisible(): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
}

function startRefreshAuth(auth: RefreshAuthServiceAuth): RefreshAuthService {
  const refreshAuth = new RefreshAuthService(auth);
  refreshServices.push(refreshAuth);
  refreshAuth.start();
  return refreshAuth;
}

describe('RefreshAuthService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    setVisible();
  });

  afterEach(() => {
    refreshServices.splice(0).forEach((refreshAuth) => refreshAuth.stop());
    vi.useRealTimers();
  });

  it('schedules one refresh two minutes before the stored expiry', () => {
    const { auth } = createAuth(10 * MINUTE);
    startRefreshAuth(auth);

    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('refreshes immediately when a restored session is inside the refresh window or expired', () => {
    const insideWindow = createAuth(90 * 1000);
    const expired = createAuth(-1);
    insideWindow.auth.refreshToken.mockResolvedValue(200);
    expired.auth.refreshToken.mockResolvedValue(200);

    startRefreshAuth(insideWindow.auth);
    startRefreshAuth(expired.auth);

    expect(insideWindow.auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(expired.auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('reschedules after exactly status 201', async () => {
    const { auth, setExpiresAt, emit } = createAuth(10 * MINUTE);
    auth.refreshToken.mockImplementation(async () => {
      const nextExpiresAt = Date.now() + 10 * MINUTE;
      setExpiresAt(nextExpiresAt);
      emit({ type: 'refresh', expiresAt: nextExpiresAt, status: 201 });
      return 201;
    });
    startRefreshAuth(auth);
    await vi.advanceTimersByTimeAsync(8 * MINUTE);

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(8 * MINUTE);

    expect(auth.refreshToken).toHaveBeenCalledTimes(2);
  });

  it.each([200, 202, 403])('stops without retrying after status %s', async (status) => {
    const { auth } = createAuth(3 * MINUTE);
    auth.refreshToken.mockResolvedValue(status);
    startRefreshAuth(auth);
    await vi.advanceTimersByTimeAsync(MINUTE);

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    document.dispatchEvent(new Event('visibilitychange'));
    await vi.runOnlyPendingTimersAsync();

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('stops without retrying after a network error', async () => {
    const { auth } = createAuth(3 * MINUTE);
    auth.refreshToken.mockRejectedValue(new Error('network error'));
    startRefreshAuth(auth);
    await vi.advanceTimersByTimeAsync(MINUTE);

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    document.dispatchEvent(new Event('visibilitychange'));
    await vi.runOnlyPendingTimersAsync();

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('does not loop when a successful refresh returns a token lasting two minutes or less', async () => {
    const { auth, setExpiresAt, emit } = createAuth(3 * MINUTE);
    auth.refreshToken.mockImplementation(async () => {
      const nextExpiresAt = Date.now() + MINUTE;
      setExpiresAt(nextExpiresAt);
      emit({ type: 'refresh', expiresAt: nextExpiresAt, status: 201 });
      return 201;
    });
    startRefreshAuth(auth);
    await vi.advanceTimersByTimeAsync(MINUTE);
    await vi.advanceTimersByTimeAsync(10 * MINUTE);

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('refreshes immediately on visibility when expiry is within two minutes', () => {
    const { auth, setExpiresAt } = createAuth(20 * MINUTE);
    auth.refreshToken.mockResolvedValue(200);
    startRefreshAuth(auth);
    vi.setSystemTime(MINUTE);
    setExpiresAt(Date.now() + 90 * 1000);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aligns the timer with the stored expiry on visibility', async () => {
    const { auth, setExpiresAt } = createAuth(20 * MINUTE);
    auth.refreshToken.mockResolvedValue(200);
    startRefreshAuth(auth);
    vi.setSystemTime(MINUTE);
    setExpiresAt(Date.now() + 10 * MINUTE);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(auth.refreshToken).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(8 * MINUTE - 1);
    expect(auth.refreshToken).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('does not issue a concurrent refresh for repeated visibility changes', () => {
    const { auth } = createAuth(90 * 1000);
    let resolveRefresh!: (status: number) => void;
    auth.refreshToken.mockReturnValue(
      new Promise<number>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    startRefreshAuth(auth);
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(auth.refreshToken).toHaveBeenCalledTimes(1);

    resolveRefresh(200);
  });

  it('updates the timer after a fallback refresh while proactive refresh is active', async () => {
    const { auth, setExpiresAt, emit } = createAuth(20 * MINUTE);
    auth.refreshToken.mockImplementation(async () => {
      const nextExpiresAt = Date.now() + 30 * MINUTE;
      setExpiresAt(nextExpiresAt);
      emit({ type: 'refresh', expiresAt: nextExpiresAt, status: 200 });
      return 200;
    });
    startRefreshAuth(auth);
    vi.setSystemTime(MINUTE);
    await auth.refreshToken();

    await vi.advanceTimersByTimeAsync(28 * MINUTE - 1);
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(auth.refreshToken).toHaveBeenCalledTimes(2);
  });

  it('does not restart after a failed proactive refresh when a fallback updates the session', async () => {
    const { auth, setExpiresAt, emit } = createAuth(3 * MINUTE);
    auth.refreshToken.mockResolvedValueOnce(200).mockImplementation(async () => {
      const nextExpiresAt = Date.now() + 20 * MINUTE;
      setExpiresAt(nextExpiresAt);
      emit({ type: 'refresh', expiresAt: nextExpiresAt, status: 200 });
      return 200;
    });
    startRefreshAuth(auth);
    await vi.advanceTimersByTimeAsync(MINUTE);
    await auth.refreshToken();

    expect(auth.refreshToken).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels timers and ignores an in-flight result after stop', async () => {
    const { auth, setExpiresAt, emit } = createAuth(90 * 1000);
    let resolveRefresh!: (status: number) => void;
    auth.refreshToken.mockReturnValue(
      new Promise<number>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const refreshAuth = startRefreshAuth(auth);
    refreshAuth.stop();
    setExpiresAt(Date.now() + 10 * MINUTE);
    emit({ type: 'refresh', expiresAt: Date.now() + 10 * MINUTE, status: 201 });
    resolveRefresh(201);
    await Promise.resolve();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels the timer when the session is cleared', () => {
    const { auth, emit } = createAuth(10 * MINUTE);
    startRefreshAuth(auth);
    emit({ type: 'cleared' });

    expect(vi.getTimerCount()).toBe(0);
  });

  it('reinitializes after a fresh login', async () => {
    const { auth, emit } = createAuth(3 * MINUTE);
    auth.refreshToken.mockResolvedValue(200);
    startRefreshAuth(auth);
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(vi.getTimerCount()).toBe(0);

    const expiresAt = Date.now() + 10 * MINUTE;
    emit({ type: 'login', expiresAt });

    expect(vi.getTimerCount()).toBe(1);
  });
});
