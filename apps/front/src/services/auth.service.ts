import { API_BASE_URL } from '../appConfig';
import type { AuthenticatedUser, AuthenticatedUserWithIntervenant } from '../types/auth.types';

/** Only the access-token expiration timestamp needs to live in localStorage.
 *  The actual tokens are stored as httpOnly cookies by the backend. */
interface SessionStorage {
  expires_at: number;
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

class AuthService {
  private storage: Storage;
  private sessionStorage: Storage;

  /** Shared promise so concurrent refreshes trigger only one request. */
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
    this.sessionStorage = typeof window !== 'undefined' ? window.sessionStorage : ({} as Storage);
  }

  /**
   * Generate a random UUID for state/nonce
   */
  private generateRandomValue(): string {
    return crypto.randomUUID();
  }

  /**
   * Initiate the OIDC login flow
   */
  async login(): Promise<void> {
    // Get OIDC configuration from backend
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get OIDC configuration');
    }

    const config: OIDCConfiguration = await response.json();

    // Generate state and nonce on frontend
    const state = this.generateRandomValue();
    const nonce = this.generateRandomValue();

    // Store state and nonce in sessionStorage for validation
    this.sessionStorage.setItem(STATE_KEY, state);
    this.sessionStorage.setItem(NONCE_KEY, nonce);

    // Build authorization URL
    const authUrl = new URL(config.authorizationEndpoint);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('scope', config.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    // Redirect to authorization endpoint
    window.location.href = authUrl.toString();
  }

  /**
   * Handle the OIDC callback after user authentication
   */
  async handleCallback(code: string, state: string): Promise<void> {
    // Retrieve state and nonce from sessionStorage
    const expectedState = this.sessionStorage.getItem(STATE_KEY);
    const expectedNonce = this.sessionStorage.getItem(NONCE_KEY);

    // Clean up
    this.sessionStorage.removeItem(STATE_KEY);
    this.sessionStorage.removeItem(NONCE_KEY);

    // Validate state
    if (!expectedState || state !== expectedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    if (!expectedNonce) {
      throw new Error('Missing nonce');
    }

    // Send code and nonce to backend
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

    // Tokens are set as httpOnly cookies by the backend.
    // We only store the expiration timestamp so the frontend can proactively refresh.
    this.storeSession({
      expires_at: Date.now() + (data.expiresIn || 3600) * 1000,
    });
  }

  /**
   * Logout the user: clear httpOnly cookies via backend, then clear local session.
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort: even if the request fails, clear local state below.
    } finally {
      this.clearSession();
    }
  }

  /**
   * Check whether a valid session exists, refreshing proactively if needed.
   * Returns a truthy string when the session is valid, null otherwise.
   */
  async getAccessToken(): Promise<string | null> {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    // Proactively refresh if the token expires within the next 60 seconds
    if (session.expires_at - Date.now() < 60000) {
      try {
        await this.refreshToken();
        return 'cookie-stored';
      } catch {
        this.clearSession();
        return null;
      }
    }

    return 'cookie-stored';
  }

  /**
   * Refresh the access token (deduplicated: concurrent calls share a single request)
   */
  async refreshToken(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefreshToken(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data: RefreshResponse = await response.json();

    this.storeSession({
      expires_at: Date.now() + (data.expiresIn || 3600) * 1000,
    });
  }

  /**
   * Check if user is authenticated (non-expired session exists locally).
   */
  isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session && session.expires_at > Date.now();
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<AuthenticatedUserWithIntervenant> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    // If the access-token cookie has expired (JWT exp, not cookie maxAge),
    // refresh and retry once before giving up.
    if (response.status === 401) {
      try {
        await this.refreshToken();
      } catch (error) {
        this.clearSession();
        throw error;
      }

      const retryResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!retryResponse.ok) {
        this.clearSession();
        throw new Error(retryResponse.status === 401 ? 'Session expired' : 'Failed to get user info');
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  private storeSession(session: SessionStorage): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  private getSession(): SessionStorage | null {
    try {
      const stored = this.storage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as SessionStorage;
    } catch (error) {
      console.error('Failed to parse session:', error);
      return null;
    }
  }

  clearSession(): void {
    try {
      this.storage.removeItem(STORAGE_KEY);
      // Also remove the legacy key if it exists (migration)
      this.storage.removeItem('oidc_tokens');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
}

export const authService = new AuthService();
