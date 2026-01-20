import type { AuthenticatedUser, AuthenticatedUserWithIntervenant } from '../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface TokenStorage {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_at: number;
}

interface AuthCallbackResponse {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: AuthenticatedUser;
}

interface RefreshResponse {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface OIDCConfiguration {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

const STORAGE_KEY = 'oidc_tokens';
const STATE_KEY = 'oidc_state';
const NONCE_KEY = 'oidc_nonce';

class AuthService {
  private storage: Storage;
  private sessionStorage: Storage;

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

    // Tokens are now set as HttpOnly cookies by the backend
    // We store the expiration and id_token (for logout hint)
    this.storeTokens({
      access_token: 'cookie-stored',
      id_token: data.idToken,
      refresh_token: 'cookie-stored',
      expires_at: Date.now() + (data.expiresIn || 3600) * 1000,
    });
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    const tokens = this.getTokens();
    const idToken = tokens?.id_token;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const { logoutUrl } = await response.json();
        this.clearTokens();
        window.location.href = logoutUrl;
      } else {
        this.clearTokens();
      }
    } catch (error) {
      this.clearTokens();
    }
  }

  /**
   * Get the current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = this.getTokens();
    if (!tokens) {
      return null;
    }

    // Check if token is expired or will expire in the next 60 seconds
    if (tokens.expires_at - Date.now() < 60000) {
      try {
        await this.refreshToken();
        return 'cookie-stored';
      } catch (error) {
        this.clearTokens();
        return null;
      }
    }

    return 'cookie-stored';
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data: RefreshResponse = await response.json();

    const tokens = this.getTokens();
    this.storeTokens({
      access_token: 'cookie-stored',
      id_token: data.idToken || tokens?.id_token || '',
      refresh_token: 'cookie-stored',
      expires_at: Date.now() + (data.expiresIn || 3600) * 1000,
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return !!tokens && tokens.expires_at > Date.now();
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<AuthenticatedUserWithIntervenant> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * Store tokens in localStorage
   */
  private storeTokens(tokens: TokenStorage): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get tokens from localStorage
   */
  private getTokens(): TokenStorage | null {
    try {
      const stored = this.storage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as TokenStorage;
    } catch (error) {
      console.error('Failed to parse tokens:', error);
      return null;
    }
  }

  /**
   * Clear tokens from localStorage
   */
  clearTokens(): void {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
}

export const authService = new AuthService();
