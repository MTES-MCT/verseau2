import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authentication, AuthenticatedUser, OIDCTokens, OIDCConfiguration } from './authentication';

@Injectable()
export class AuthenticationMockService implements Authentication {
  constructor(private readonly configService: ConfigService) {}

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const providedToken = token?.trim();

    if (!providedToken) {
      throw new Error('Missing token');
    }

    return this.getMockUser();
  }

  getOIDCConfiguration(): OIDCConfiguration {
    return {
      authorizationEndpoint: 'http://localhost:5173/mock_authorization',
      clientId: 'mock-client-id',
      redirectUri: 'http://localhost:5173/dashboard',
      scope: 'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations',
    };
  }

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

  async getUserInfo(accessToken: string): Promise<AuthenticatedUser> {
    return this.getMockUser();
  }

  async refreshTokens(refreshToken: string): Promise<OIDCTokens> {
    const fakeToken = 'mock-token';
    return {
      accessToken: fakeToken,
      idToken: fakeToken,
      refreshToken: fakeToken,
      expiresIn: 3600,
    };
  }

  generateLogoutUrl(idToken: string): string {
    return 'http://localhost:5173';
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
