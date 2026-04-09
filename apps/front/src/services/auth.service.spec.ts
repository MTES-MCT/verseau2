import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('authService.refreshToken deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());

    // Provide localStorage stub
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });

    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
  });

  async function loadAuthService() {
    const mod = await import('./auth.service');
    return mod.authService;
  }

  const refreshResponse = (expiresIn = 3600) =>
    new Response(JSON.stringify({ expiresIn }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  it('deduplicates concurrent refreshToken calls into a single fetch', async () => {
    const authService = await loadAuthService();

    let resolveRefresh!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    // Fire 5 concurrent refresh calls
    const promises = [
      authService.refreshToken(),
      authService.refreshToken(),
      authService.refreshToken(),
      authService.refreshToken(),
      authService.refreshToken(),
    ];

    // Only one fetch should have been made
    expect(fetch).toHaveBeenCalledTimes(1);

    // Resolve the single fetch
    resolveRefresh(refreshResponse());

    await Promise.all(promises);

    // Still only one fetch call
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after the previous one completes', async () => {
    const authService = await loadAuthService();

    vi.mocked(fetch).mockResolvedValueOnce(refreshResponse()).mockResolvedValueOnce(refreshResponse());

    await authService.refreshToken();
    await authService.refreshToken();

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects all concurrent callers when refresh fails', async () => {
    const authService = await loadAuthService();

    vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    const promises = [authService.refreshToken(), authService.refreshToken(), authService.refreshToken()];

    const results = await Promise.allSettled(promises);

    // All should reject
    results.forEach((r) => expect(r.status).toBe('rejected'));
    // Only one fetch was made
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
