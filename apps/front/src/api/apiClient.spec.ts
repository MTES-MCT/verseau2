import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getControles, getMasa } from '@lib/dossier';

const mockRefreshToken = vi.fn();
const mockClearSession = vi.fn();

vi.mock('../services/auth.service', () => ({
  authService: {
    refreshToken: mockRefreshToken,
    clearSession: mockClearSession,
  },
}));

describe('authenticatedFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshToken.mockReset();
    mockClearSession.mockReset();
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
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(locationSpy.href).toBe('/');
  });
});

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  async function loadApiClient() {
    return import('./apiClient');
  }

  it('returns valid JSON', async () => {
    const { apiCall } = await loadApiClient();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json([]));

    await expect(apiCall(getControles, { params: { depotId: 'depot-1' } })).resolves.toEqual([]);
  });

  it('returns a JSON null response', async () => {
    const { apiCall } = await loadApiClient();
    vi.mocked(fetch).mockResolvedValueOnce(new Response('null', { status: 200 }));

    await expect(apiCall(getMasa, { params: { depotId: 'depot-1' } })).resolves.toBeNull();
  });

  it('returns null for an empty response when the route response is nullable', async () => {
    const { apiCall } = await loadApiClient();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(apiCall(getMasa, { params: { depotId: 'depot-1' } })).resolves.toBeNull();
  });

  it('throws an ApiError for an empty response when the route response is not nullable', async () => {
    const { apiCall, ApiError } = await loadApiClient();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200, statusText: 'OK' }));

    const result = apiCall(getControles, { params: { depotId: 'depot-1' } });

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'GET /depot/depot-1/controle returned an empty response body',
        status: 200,
        statusText: 'OK',
      }),
    );
    await expect(result).rejects.toBeInstanceOf(ApiError);
  });

  it('throws a contextual ApiError for malformed JSON without including the response body', async () => {
    const { apiCall, ApiError } = await loadApiClient();
    const malformedBody = '{"secret":"redacted"';
    vi.mocked(fetch).mockResolvedValueOnce(new Response(malformedBody, { status: 200, statusText: 'OK' }));

    const result = apiCall(getMasa, { params: { depotId: 'depot-1' } });

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'GET /depot/depot-1/masa returned malformed JSON',
        status: 200,
        statusText: 'OK',
      }),
    );
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.not.toThrow(malformedBody);
  });
});
