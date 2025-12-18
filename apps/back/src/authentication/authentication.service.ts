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

@Injectable()
export class AuthenticationService implements Authentication {
  private readonly redirectUri: string;
  private readonly clientId: string;
  private readonly scope =
    'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations';

  constructor(
    private readonly configuration: Configuration,
    private readonly configService: ConfigService,
  ) {
    this.redirectUri = this.configService.getOrThrow<string>('OIDC_REDIRECT_URI');
    this.clientId = this.configService.getOrThrow<string>('OIDC_CLIENT_ID');
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      // Validate token by fetching user info (which validates the token internally)
      return await this.getUserInfo(token);
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
    const userInfo: UserInfoResponse = await fetchUserInfo(this.configuration, accessToken, skipSubjectCheck);

    return {
      cerbereId: userInfo.sub || '',
      login: (userInfo.preferred_username as string) || (userInfo.uid as string) || '',
      nom: (userInfo.usual_name as string) || (userInfo.family_name as string) || '',
      prenom: (userInfo.given_name as string) || '',
      mel: (userInfo.email as string) || '',
      matricule: (userInfo.cerbere_matricule as string) || userInfo.sub || '',
      unite: userInfo.organizational_unit as string | undefined,
      emailMetier: userInfo.email_metier as string | undefined,
      description: userInfo.cerbere_description as string | undefined,
      mobile: userInfo.cerbere_mobile as string | undefined,
      telephone: userInfo.phone_number,
      profils: userInfo.cerbere_profils as string[] | undefined,
      roles: userInfo.cerbere_roles as string[] | undefined,
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
