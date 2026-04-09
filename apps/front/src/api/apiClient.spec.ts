import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRefreshToken = vi.fn();
const mockClearTokens = vi.fn();

vi.mock('../services/auth.service', () => ({
  authService: {
    refreshToken: mockRefreshToken,
    clearTokens: mockClearTokens,
    getAccessToken: vi.fn().mockResolvedValue('token'),
  },
}));

describe('authenticatedFetch', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());

    // Re-import to reset the module-level refreshPromise
    vi.resetModules();
  });

  async function loadAuthenticatedFetch() {
    const mod = await import('./apiClient');
    return mod.authenticatedFetch;
  }

  const ok200 = () => new Response('ok', { status: 200, statusText: 'OK' });

  const unauthorized401 = () => new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });

  /** Flush pending microtasks so all concurrent awaits settle. */
  const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 0));

  it('returns the response directly when status is not 401', async () => {
    const authenticatedFetch = await loadAuthenticatedFetch();
    vi.mocked(fetch).mockResolvedValueOnce(ok200());

    const response = await authenticatedFetch('/api/test');

    expect(response.status).toBe(200);
    expect(mockRefreshToken).not.toHaveBeenCalled();
  });

  it('refreshes token and retries on 401', async () => {
    const authenticatedFetch = await loadAuthenticatedFetch();
    vi.mocked(fetch).mockResolvedValueOnce(unauthorized401()).mockResolvedValueOnce(ok200());
    mockRefreshToken.mockResolvedValueOnce(undefined);

    const response = await authenticatedFetch('/api/test');

    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it('triggers only one refresh when multiple parallel requests get 401', async () => {
    const authenticatedFetch = await loadAuthenticatedFetch();

    // Deferred refresh: we control when it resolves
    let resolveRefresh!: () => void;
    mockRefreshToken.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    // First 5 fetch calls → 401, subsequent calls → 200 (retries)
    vi.mocked(fetch).mockImplementation(() => {
      const callCount = vi.mocked(fetch).mock.calls.length;
      if (callCount <= 5) {
        return Promise.resolve(unauthorized401());
      }
      return Promise.resolve(ok200());
    });

    // Fire 5 parallel requests (they all yield at the first await)
    const promises = [
      authenticatedFetch('/api/endpoint-1'),
      authenticatedFetch('/api/endpoint-2'),
      authenticatedFetch('/api/endpoint-3'),
      authenticatedFetch('/api/endpoint-4'),
      authenticatedFetch('/api/endpoint-5'),
    ];

    // Let microtasks run so all 5 calls receive their 401 and reach the
    // refresh gate. The refresh promise is still pending, so they are all
    // blocked on `await refreshPromise`.
    await flushMicrotasks();

    // At this point all 5 calls got their 401 and only ONE triggered the refresh
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    // The 5 initial fetches were made, but no retries yet (blocked on refresh)
    expect(fetch).toHaveBeenCalledTimes(5);

    // Now unblock the refresh
    resolveRefresh();

    const responses = await Promise.all(promises);

    // Still only 1 refresh call total
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    // 5 initial + 5 retries
    expect(fetch).toHaveBeenCalledTimes(10);
    expect(responses).toHaveLength(5);
    responses.forEach((r) => expect(r.status).toBe(200));
  });

  it('redirects to / and throws when refresh fails', async () => {
    const authenticatedFetch = await loadAuthenticatedFetch();

    const locationSpy = { href: '' };
    vi.stubGlobal('location', locationSpy);

    vi.mocked(fetch).mockResolvedValueOnce(unauthorized401());
    mockRefreshToken.mockRejectedValueOnce(new Error('refresh failed'));

    await expect(authenticatedFetch('/api/test')).rejects.toThrow('Session expired');
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    expect(locationSpy.href).toBe('/');
  });
});
