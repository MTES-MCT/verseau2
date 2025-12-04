import { Injectable } from '@nestjs/common';
import { Configuration, tokenIntrospection, type IntrospectionResponse } from 'openid-client';
import { Authentication, AuthenticatedUser } from './authentication';

@Injectable()
export class AuthenticationService implements Authentication {
  constructor(private readonly configuration: Configuration) {}

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const introspection: IntrospectionResponse = await tokenIntrospection(this.configuration, token);

    if (!introspection.active) {
      throw new Error('Token is not active');
    }

    if (!introspection.sub) {
      throw new Error('Token missing required "sub" claim');
    }

    return {
      cerbereId: introspection.sub,
      login: introspection.username || '',
      nom: (introspection.name as string) || '',
      prenom: (introspection.given_name as string) || '',
      mel: (introspection.email as string) || '',
      matricule: introspection.sub,
    };
  }
}
