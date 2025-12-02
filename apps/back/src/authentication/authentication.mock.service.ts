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
        sub: 'test-user-id',
        email: 'dev@example.com',
        email_verified: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        roles: ['admin'],
        active: true,
      });
    });
  }
}
