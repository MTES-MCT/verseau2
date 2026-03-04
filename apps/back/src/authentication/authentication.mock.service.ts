import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authentication, AuthenticatedUser, OIDCTokens, OIDCConfiguration } from './authentication';
import type { Response } from 'express';

@Injectable()
export class AuthenticationMockService implements Authentication {
  constructor(private readonly configService: ConfigService) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateToken(token: string): Promise<AuthenticatedUser> {
    const providedToken = token?.trim();

    if (!providedToken) {
      throw new Error('Missing token');
    }

    return this.getMockUser();
  }

  getOIDCConfiguration(): Promise<OIDCConfiguration> {
    return Promise.resolve({
      authorizationEndpoint: 'http://localhost:5173/mock_authorization',
      clientId: 'mock-client-id',
      redirectUri: 'http://localhost:5173/dashboard',
      scope: 'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUser }> {
    const fakeToken = 'mock-token';
    return {
      accessToken: fakeToken,
      idToken: fakeToken,
      refreshToken: fakeToken,
      expiresIn: 3600,
      user: this.getMockUser(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async getUserInfo(accessToken: string): Promise<AuthenticatedUser> {
    return this.getMockUser();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async refreshTokens(refreshToken: string): Promise<OIDCTokens> {
    const fakeToken = 'mock-token';
    return {
      accessToken: fakeToken,
      idToken: fakeToken,
      refreshToken: fakeToken,
      expiresIn: 3600,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateLogoutUrl(idToken: string): Promise<string> {
    return Promise.resolve('http://localhost:5173');
  }

  private get baseCookieOptions() {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  buildCookieResponse(res: Response, tokens: OIDCTokens): void {
    // In mock, set cookies similarly to real implementation for tests
    res.cookie('access_token', tokens.accessToken, this.baseCookieOptions);

    if (tokens.refreshToken) {
      res.cookie('refresh_token', tokens.refreshToken, this.baseCookieOptions);
    }
  }

  clearCookieResponse(res: Response): void {
    res.clearCookie('access_token', this.baseCookieOptions);
    res.clearCookie('refresh_token', this.baseCookieOptions);
  }

  private getMockUser(): AuthenticatedUser {
    return {
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: null,
      isExpertNational: false,
    };
  }
}
