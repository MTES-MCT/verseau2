import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('authService', () => {
  let localStore: Record<string, string>;
  let sessionStore: Record<string, string>;
  let redirectedTo: string | null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    redirectedTo = null;

    // Provide localStorage stub
    localStore = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStore[key] ?? null,
      setItem: (key: string, value: string) => {
        localStore[key] = value;
      },
      removeItem: (key: string) => {
        delete localStore[key];
      },
    });

    sessionStore = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStore[key] ?? null,
      setItem: (key: string, value: string) => {
        sessionStore[key] = value;
      },
      removeItem: (key: string) => {
        delete sessionStore[key];
      },
    });

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValueOnce('state-123').mockReturnValueOnce('nonce-456'),
    });
  });

  async function loadAuthService() {
    const { AuthService } = await import('./auth.service');
    return new AuthService((url) => {
      redirectedTo = url;
    });
  }

  const refreshResponse = (expiresIn = 3600) =>
    new Response(JSON.stringify({ expiresIn }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  const oidcConfigurationResponse = () =>
    new Response(
      JSON.stringify({
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'verseau2',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid profile',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );

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

  it('resumes the local session on login when refresh succeeds', async () => {
    const authService = await loadAuthService();

    vi.mocked(fetch).mockResolvedValueOnce(refreshResponse(120));

    const sessionResumed = await authService.login();

    expect(sessionResumed).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    expect(redirectedTo).toBeNull();

    const storedSession = JSON.parse(localStore.verseau_session) as { expires_at: number };
    expect(storedSession.expires_at).toBeGreaterThan(Date.now());
  });

  it('starts a silent Cerbere login when local refresh fails', async () => {
    const authService = await loadAuthService();

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(oidcConfigurationResponse());

    const sessionResumed = await authService.login();

    expect(sessionResumed).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sessionStore.oidc_silent_login).toBe('true');
    expect(sessionStore.oidc_state).toBe('state-123');
    expect(sessionStore.oidc_nonce).toBe('nonce-456');

    expect(redirectedTo).not.toBeNull();
    const redirectUrl = new URL(redirectedTo!);
    expect(redirectUrl.searchParams.get('prompt')).toBe('none');
    expect(redirectUrl.searchParams.get('state')).toBe('state-123');
    expect(redirectUrl.searchParams.get('nonce')).toBe('nonce-456');
  });

  it('starts an interactive Cerbere login without retrying refresh when requested', async () => {
    const authService = await loadAuthService();

    vi.mocked(fetch).mockResolvedValueOnce(oidcConfigurationResponse());

    const sessionResumed = await authService.login({ silent: false, skipLocalRefresh: true });

    expect(sessionResumed).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), { method: 'GET' });
    expect(sessionStore.oidc_silent_login).toBeUndefined();

    expect(redirectedTo).not.toBeNull();
    const redirectUrl = new URL(redirectedTo!);
    expect(redirectUrl.searchParams.has('prompt')).toBe(false);
  });

  it('consumes silent login attempts and identifies fallback errors', async () => {
    const authService = await loadAuthService();

    sessionStore.oidc_silent_login = 'true';

    expect(authService.consumeSilentLoginAttempt()).toBe(true);
    expect(sessionStore.oidc_silent_login).toBeUndefined();
    expect(authService.consumeSilentLoginAttempt()).toBe(false);
    expect(authService.isSilentLoginFallbackError('login_required')).toBe(true);
    expect(authService.isSilentLoginFallbackError('server_error')).toBe(false);
  });
});
