import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authentication, AuthenticatedUser } from './authentication';

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

    return new Promise<AuthenticatedUser>((resolve) => {
      resolve({
        cerbereId: 'test-user-id',
        login: 'test-user-login',
        nom: 'Test',
        prenom: 'User',
        mel: 'dev@example.com',
        matricule: '1234567890',
      });
    });
  }
}
