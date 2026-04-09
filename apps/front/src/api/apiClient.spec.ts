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

    vi.resetModules();
  });

  async function loadAuthenticatedFetch() {
    const mod = await import('./apiClient');
    return mod.authenticatedFetch;
  }

  const ok200 = () => new Response('ok', { status: 200, statusText: 'OK' });

  const unauthorized401 = () => new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });

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

  it('delegates refresh to authService for each 401 (dedup is in authService)', async () => {
    const authenticatedFetch = await loadAuthenticatedFetch();

    // authService.refreshToken is mocked, so each call resolves independently.
    // The real deduplication happens inside authService.refreshToken().
    mockRefreshToken.mockResolvedValue(undefined);

    // First 3 fetch calls → 401, subsequent calls → 200 (retries)
    let callCount = 0;
    vi.mocked(fetch).mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        return Promise.resolve(unauthorized401());
      }
      return Promise.resolve(ok200());
    });

    const promises = [
      authenticatedFetch('/api/endpoint-1'),
      authenticatedFetch('/api/endpoint-2'),
      authenticatedFetch('/api/endpoint-3'),
    ];

    const responses = await Promise.all(promises);

    // Each 401 delegates to authService.refreshToken (which deduplicates internally)
    expect(mockRefreshToken).toHaveBeenCalledTimes(3);
    // 3 initial + 3 retries
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(responses).toHaveLength(3);
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
