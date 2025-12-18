import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authentication, AuthenticatedUser, OIDCTokens, OIDCConfiguration } from './authentication';

@Injectable()
export class AuthenticationMockService implements Authentication {
  constructor(private readonly configService: ConfigService) {}

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const providedToken = token?.trim();
    const expectedToken = this.configService.get<string>('OIDC_FAKE_TOKEN')?.trim();

    if (!expectedToken) {
      throw new Error('OIDC_FAKE_TOKEN is not configured');
    }

    if (!providedToken || providedToken !== expectedToken) {
      throw new Error('Invalid or missing fake token');
    }

    return this.getMockUser();
  }

  getOIDCConfiguration(): OIDCConfiguration {
    return {
      authorizationEndpoint: 'http://localhost:5173/authentication_callback',
      clientId: 'mock-client-id',
      redirectUri: 'http://localhost:5173/api/auth/callback',
      scope: 'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations',
    };
  }

  async handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUser }> {
    const fakeToken = this.configService.get<string>('OIDC_FAKE_TOKEN') || 'mock-token';
    return {
      accessToken: fakeToken,
      idToken: fakeToken,
      refreshToken: fakeToken,
      expiresIn: 3600,
      user: this.getMockUser(),
    };
  }

  async getUserInfo(accessToken: string): Promise<AuthenticatedUser> {
    return this.getMockUser();
  }

  async refreshTokens(refreshToken: string): Promise<OIDCTokens> {
    const fakeToken = this.configService.get<string>('OIDC_FAKE_TOKEN') || 'mock-token';
    return {
      accessToken: fakeToken,
      idToken: fakeToken,
      refreshToken: fakeToken,
      expiresIn: 3600,
    };
  }

  generateLogoutUrl(idToken: string): string {
    return 'http://mock-logout-url';
  }

  private getMockUser(): AuthenticatedUser {
    return {
      cerbereId: 'test-user-id',
      login: 'test-user-login',
      nom: 'Test',
      prenom: 'User',
      mel: 'dev@example.com',
      matricule: '1234567890',
      unite: 'DREAL Île-de-France',
      emailMetier: 'dev.metier@example.com',
      description: 'Développeur test',
      mobile: '0601020304',
      telephone: '0140506070',
      profils: ['CONSULTANT;fr;none', 'GESTIONNAIRE;fr;75'],
      roles: ['CONSULTANT', 'GESTIONNAIRE'],
    };
  }
}
