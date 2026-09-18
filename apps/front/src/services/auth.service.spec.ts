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

  it('exposes the refresh response status', async () => {
    const authService = await loadAuthService();

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ expiresIn: 3600 }), { status: 201 }));

    await expect(authService.refreshToken()).resolves.toBe(201);
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

describe('authService OIDC transaction', () => {
  let sessionStore: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    sessionStore = {};
    const localStore: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStore[key] ?? null,
      setItem: (key: string, value: string) => {
        sessionStore[key] = String(value);
      },
      removeItem: (key: string) => {
        delete sessionStore[key];
      },
      clear: () => {
        sessionStore = {};
      },
    });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStore[key] ?? null,
      setItem: (key: string, value: string) => {
        localStore[key] = String(value);
      },
      removeItem: (key: string) => {
        delete localStore[key];
      },
      clear: () => {
        for (const key of Object.keys(localStore)) {
          delete localStore[key];
        }
      },
    });
  });

  async function loadAuthService() {
    const mod = await import('./auth.service');
    return mod.authService;
  }

  const loginConfig = (state = 'server-state-abc') =>
    new Response(
      JSON.stringify({
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid profile',
        state,
        nonce: 'server-nonce-abc',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  it('initializes a server transaction with credentials included', async () => {
    const authService = await loadAuthService();
    vi.mocked(fetch).mockResolvedValueOnce(loginConfig('server-state-abc'));

    const state = await authService.initMockTransaction();

    expect(state).toBe('server-state-abc');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(sessionStore['oidc_state']).toBe('server-state-abc');
  });

  it('sends code and state (never a nonce) to the callback', async () => {
    const authService = await loadAuthService();
    sessionStore['oidc_state'] = 'server-state-abc';
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ expiresIn: 3600, user: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await authService.handleCallback('auth-code', 'server-state-abc');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/auth\/callback$/);
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body as string)).toEqual({ code: 'auth-code', state: 'server-state-abc' });
  });

  it('rejects a mismatched state without calling the backend', async () => {
    const authService = await loadAuthService();
    sessionStore['oidc_state'] = 'server-state-abc';

    await expect(authService.handleCallback('attacker-code', 'attacker-state')).rejects.toThrow();

    expect(fetch).not.toHaveBeenCalled();
  });
});
