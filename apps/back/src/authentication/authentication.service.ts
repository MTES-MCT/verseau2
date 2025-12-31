import { Injectable } from '@nestjs/common';

import {
  Configuration,
  authorizationCodeGrant,
  refreshTokenGrant,
  fetchUserInfo,
  skipSubjectCheck,
  type UserInfoResponse,
} from 'openid-client';
import { Authentication, AuthenticatedUser, OIDCTokens, OIDCConfiguration } from './authentication';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/logger/logger.service';
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

@Injectable()
export class AuthenticationService implements Authentication {
  private readonly redirectUri: string;
  private readonly clientId: string;
  private readonly scope =
    'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations';
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly configuration: Configuration,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.redirectUri = this.configService.getOrThrow<string>('OIDC_REDIRECT_URI');
    this.clientId = this.configService.getOrThrow<string>('OIDC_CLIENT_ID');
    this.logger.setContext(AuthenticationService.name);
  }

  private getJWKS() {
    if (!this.jwks) {
      const metadata = this.configuration.serverMetadata();
      if (!metadata.jwks_uri) {
        throw new Error('JWKS URI not available in OIDC metadata');
      }
      this.jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
    }
    return this.jwks;
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      try {
        // Attempt local JWT verification first
        const jwks = this.getJWKS();
        const { payload } = await jwtVerify(token, jwks, {
          issuer: this.configuration.serverMetadata().issuer,
          audience: this.clientId,
        });

        return this.mapClaimsToUser(payload);
      } catch {
        // Fallback to fetchUserInfo if JWT verification fails (e.g. opaque token or local validation issues)
        return await this.getUserInfo(token);
      }
    } catch (error) {
      throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getOIDCConfiguration(): OIDCConfiguration {
    const metadata = this.configuration.serverMetadata();
    const authEndpoint = metadata.authorization_endpoint;
    if (!authEndpoint) {
      throw new Error('Authorization endpoint not available');
    }

    return {
      authorizationEndpoint: authEndpoint,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scope: this.scope,
    };
  }

  async handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUser }> {
    const callbackUrl = new URL(this.redirectUri);
    callbackUrl.searchParams.set('code', code);

    const tokens = await authorizationCodeGrant(this.configuration, callbackUrl, {
      expectedNonce: nonce,
      pkceCodeVerifier: undefined,
    });

    const user = await this.getUserInfo(tokens.access_token);

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token!,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user,
    };
  }

  async getUserInfo(accessToken: string): Promise<AuthenticatedUser> {
    this.logger.debug(`Getting user info for access token: ${accessToken}`);

    const userInfo: UserInfoResponse = await fetchUserInfo(this.configuration, accessToken, skipSubjectCheck);
    this.logger.debug(`User info received: ${JSON.stringify(userInfo)}`);

    return this.mapOpenIdUserToUser(userInfo);
  }

  private mapOpenIdUserToUser(claims: UserInfoResponse): AuthenticatedUser {
    return {
      cerbereId: claims.sub,
      login: (claims.preferred_username as string) || (claims.uid as string) || '',
      nom: (claims.usual_name as string) || (claims.family_name as string) || '',
      prenom: (claims.given_name as string) || '',
      mel: (claims.email as string) || '',
      matricule: (claims.cerbere_matricule as string) || claims.sub || '',
      unite: claims.organizational_unit as string | undefined,
      emailMetier: claims.email_metier as string | undefined,
      description: claims.cerbere_description as string | undefined,
      mobile: claims.cerbere_mobile as string | undefined,
      telephone: claims.phone_number,
      profils: claims.cerbere_profils as string[] | undefined,
      roles: claims.cerbere_roles as string[] | undefined,
    };
  }

  private mapClaimsToUser(claims: JWTPayload): AuthenticatedUser {
    return {
      cerbereId: (claims.sub as string) || '',
      login: (claims.preferred_username as string) || (claims.uid as string) || '',
      nom: (claims.usual_name as string) || (claims.family_name as string) || '',
      prenom: (claims.given_name as string) || '',
      mel: (claims.email as string) || '',
      matricule: (claims.cerbere_matricule as string) || (claims.sub as string) || '',
      unite: claims.organizational_unit as string | undefined,
      emailMetier: claims.email_metier as string | undefined,
      description: claims.cerbere_description as string | undefined,
      mobile: claims.cerbere_mobile as string | undefined,
      telephone: claims.phone_number as string | undefined,
      profils: claims.cerbere_profils as string[] | undefined,
      roles: claims.cerbere_roles as string[] | undefined,
    };
  }

  async refreshTokens(refreshToken: string): Promise<OIDCTokens> {
    const tokens = await refreshTokenGrant(this.configuration, refreshToken);

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token || '',
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };
  }

  generateLogoutUrl(idToken: string): string {
    const endSessionEndpoint = this.configuration.serverMetadata().end_session_endpoint;
    if (!endSessionEndpoint) {
      throw new Error('End session endpoint not available');
    }

    const logoutUrl = new URL(endSessionEndpoint);
    logoutUrl.searchParams.set('id_token_hint', idToken);
    logoutUrl.searchParams.set('post_logout_redirect_uri', this.redirectUri.replace('/api/auth/callback', ''));

    return logoutUrl.toString();
  }
}
