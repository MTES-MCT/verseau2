import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import {
  Configuration,
  discovery,
  authorizationCodeGrant,
  refreshTokenGrant,
  fetchUserInfo,
  skipSubjectCheck,
  type UserInfoResponse,
} from 'openid-client';
import { Authentication, AuthenticatedUser, OIDCTokens, OIDCConfiguration } from './authentication';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/logger/logger.service';
import { SignJWT, jwtVerify } from 'jose';
import { DroitsUserService } from '@user/droitsUser.service';

@Injectable()
export class AuthenticationService implements Authentication {
  private readonly redirectUri: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly issuerUrl: string;
  private readonly jwtSecret: Uint8Array;
  private readonly scope =
    'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations';
  private configuration: Configuration | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly droitsUserService: DroitsUserService,
  ) {
    this.redirectUri = this.configService.getOrThrow<string>('OIDC_REDIRECT_URI');
    this.clientId = this.configService.getOrThrow<string>('OIDC_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('OIDC_CLIENT_SECRET');
    this.issuerUrl = this.configService.getOrThrow<string>('OIDC_ISSUER_URL');
    this.jwtSecret = new TextEncoder().encode(this.configService.getOrThrow<string>('JWT_SECRET'));
    this.logger.setContext(AuthenticationService.name);
  }

  private async getConfiguration(): Promise<Configuration> {
    if (!this.configuration) {
      try {
        this.configuration = await discovery(new URL(this.issuerUrl), this.clientId, {
          client_secret: this.clientSecret,
        });
      } catch (error) {
        throw new ServiceUnavailableException(
          `OIDC provider unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
    return this.configuration;
  }

  /**
   * Forge un JWT interne Verseau2 signé avec JWT_SECRET (HMAC-SHA256).
   * Contient les claims métier (sub, email, itvCdn, isExpertNational).
   */
  private async signInternalToken(
    sub: string,
    email: string,
    itvCdn: number | null,
    isExpertNational: boolean,
    expiresIn?: number,
  ): Promise<string> {
    const jwt = new SignJWT({ sub, email, itvCdn, isExpertNational })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt();

    if (expiresIn) {
      jwt.setExpirationTime(`${expiresIn}s`);
    } else {
      jwt.setExpirationTime('1h');
    }

    return jwt.sign(this.jwtSecret);
  }

  /**
   * Résout les claims métier (itvCdn, isExpertNational) depuis Lanceleau via DroitsUserService.
   */
  private async resolveBusinessClaims(sub: string): Promise<{ itvCdn: number | null; isExpertNational: boolean }> {
    const [itvCdn, isExpertNational] = await Promise.all([
      this.droitsUserService.resolveItvCdn(sub),
      this.droitsUserService.isExpertNationalVerseau(sub),
    ]);
    return { itvCdn, isExpertNational };
  }

  /**
   * Valide exclusivement le JWT interne signé par Verseau2.
   * Tout token non signé par JWT_SECRET est rejeté (pas de fallback Cerbere).
   */
  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      });

      return this.mapInternalClaimsToUser(payload);
    } catch (error) {
      throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOIDCConfiguration(): Promise<OIDCConfiguration> {
    const configuration = await this.getConfiguration();
    const metadata = configuration.serverMetadata();
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
    const configuration = await this.getConfiguration();
    const callbackUrl = new URL(this.redirectUri);
    callbackUrl.searchParams.set('code', code);

    const tokens = await authorizationCodeGrant(configuration, callbackUrl, {
      expectedNonce: nonce,
      pkceCodeVerifier: undefined,
    });

    const user = await this.getUserInfo(tokens.access_token);

    // Résoudre les claims métier depuis Lanceleau
    const { itvCdn, isExpertNational } = await this.resolveBusinessClaims(user.cerbereId);

    // Forger le JWT interne Verseau2
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.mel,
      itvCdn,
      isExpertNational,
      tokens.expires_in,
    );

    const enrichedUser: AuthenticatedUser = { ...user, itvCdn, isExpertNational };

    return {
      accessToken: internalToken,
      idToken: tokens.id_token!,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      cerbereAccessToken: tokens.access_token,
      user: enrichedUser,
    };
  }

  async getUserInfo(accessToken: string): Promise<AuthenticatedUser> {
    const configuration = await this.getConfiguration();
    this.logger.debug(`Getting user info for access token: ${accessToken}`);

    const userInfo: UserInfoResponse = await fetchUserInfo(configuration, accessToken, skipSubjectCheck);
    this.logger.debug(`User info received: ${JSON.stringify(userInfo)}`);

    return this.mapOpenIdUserToUser(userInfo);
  }

  private mapOpenIdUserToUser(claims: UserInfoResponse): AuthenticatedUser {
    return {
      cerbereId: claims.sub,
      nom: (claims.usual_name as string) || (claims.family_name as string) || '',
      prenom: (claims.given_name as string) || '',
      mel: (claims.email as string) || '',
      itvCdn: null,
      isExpertNational: false,
    };
  }

  /**
   * Mappe les claims du JWT interne Verseau2 vers AuthenticatedUser.
   * Le JWT interne ne contient que sub, email, itvCdn, isExpertNational.
   * Les autres champs (nom, prenom, etc.) ne sont pas dans le token
   * et seront résolus depuis la DB locale si nécessaire (ex: /me).
   */
  private mapInternalClaimsToUser(claims: Record<string, unknown>): AuthenticatedUser {
    return {
      cerbereId: (claims.sub as string) || '',
      nom: '',
      prenom: '',
      mel: (claims.email as string) || '',
      itvCdn: (claims.itvCdn as number) ?? null,
      isExpertNational: (claims.isExpertNational as boolean) ?? false,
    };
  }

  async refreshTokens(refreshToken: string): Promise<OIDCTokens> {
    const configuration = await this.getConfiguration();
    const tokens = await refreshTokenGrant(configuration, refreshToken);

    // Récupérer les infos utilisateur depuis le nouveau token Cerbere
    const user = await this.getUserInfo(tokens.access_token);

    // Re-résoudre les claims métier (peuvent avoir changé)
    const { itvCdn, isExpertNational } = await this.resolveBusinessClaims(user.cerbereId);

    // Re-forger le JWT interne Verseau2
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.mel,
      itvCdn,
      isExpertNational,
      tokens.expires_in,
    );

    return {
      accessToken: internalToken,
      idToken: tokens.id_token || '',
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      cerbereAccessToken: tokens.access_token,
    };
  }

  async generateLogoutUrl(idToken: string): Promise<string> {
    const configuration = await this.getConfiguration();
    const endSessionEndpoint = configuration.serverMetadata().end_session_endpoint;
    if (!endSessionEndpoint) {
      throw new Error('End session endpoint not available');
    }

    const logoutUrl = new URL(endSessionEndpoint);
    logoutUrl.searchParams.set('id_token_hint', idToken);
    logoutUrl.searchParams.set('post_logout_redirect_uri', this.redirectUri.replace('/api/auth/callback', ''));

    return logoutUrl.toString();
  }

  buildCookieResponse(res: Response, tokens: OIDCTokens): void {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: tokens.expiresIn ? tokens.expiresIn * 1000 : undefined,
    };
    res.cookie('access_token', tokens.accessToken, cookieOptions);

    if (tokens.cerbereAccessToken) {
      res.cookie('cerbere_token', tokens.cerbereAccessToken, cookieOptions);
    }

    if (tokens.refreshToken) {
      res.cookie('refresh_token', tokens.refreshToken, cookieOptions);
    }
  }
}
