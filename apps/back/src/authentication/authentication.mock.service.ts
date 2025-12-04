import { Injectable } from '@nestjs/common';
import { Authentication, AuthenticatedUser } from './authentication';

@Injectable()
export class AuthenticationMockService implements Authentication {
  async validateToken(token: string): Promise<AuthenticatedUser> {
    if (!token || token.trim() === '') {
      throw new Error('Token is required');
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
