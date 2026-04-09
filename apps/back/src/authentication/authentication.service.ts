import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import {
  Configuration,
  discovery,
  authorizationCodeGrant,
  refreshTokenGrant,
  fetchUserInfo,
  type UserInfoResponse,
  type TokenEndpointResponse,
  type TokenEndpointResponseHelpers,
} from 'openid-client';
import {
  Authentication,
  AuthenticatedUser,
  OIDCTokens,
  OIDCConfiguration,
  AuthenticatedUserAndNomPrenom,
} from './authentication';
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
      this.logger.error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException();
    }
  }

  /**
   * Vérifie la signature HMAC du JWT interne Verseau2 (en tolérant l'expiration)
   * et retourne le claim `sub`. Utilisé lors du refresh pour obtenir le sujet
   * attendu de manière sûre plutôt que de décoder le payload sans vérification.
   */
  async extractSubjectFromExpiredToken(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        // Le refresh est appelé précisément quand l'access token a expiré.
        // On tolère une expiration de 7 jours (durée max du refresh token).
        clockTolerance: 7 * 24 * 60 * 60,
      });

      if (!payload.sub) {
        throw new Error('Missing sub claim');
      }

      return payload.sub;
    } catch (error) {
      this.logger.error(
        `Failed to extract subject from expired token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException();
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

  async handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUserAndNomPrenom }> {
    const configuration = await this.getConfiguration();
    const callbackUrl = new URL(this.redirectUri);
    callbackUrl.searchParams.set('code', code);

    const tokens = await authorizationCodeGrant(configuration, callbackUrl, {
      expectedNonce: nonce,
      pkceCodeVerifier: undefined,
    });

    const idTokenClaims = tokens.claims();
    if (!idTokenClaims) {
      throw new UnauthorizedException('No ID token returned by the authorization server');
    }

    const userInfo = await this.fetchUserInfoClaims(tokens.access_token, idTokenClaims.sub);
    const user = this.mapOpenIdUserToUser(userInfo);

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

    const enrichedUser: AuthenticatedUserAndNomPrenom = {
      ...user,
      itvCdn,
      isExpertNational,
      nom: (userInfo.family_name as string) || undefined,
      prenom: (userInfo.given_name as string) || undefined,
    };

    return {
      accessToken: internalToken,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      cerbereAccessToken: tokens.access_token,
      user: enrichedUser,
    };
  }

  private async fetchUserInfoClaims(accessToken: string, expectedSubject: string): Promise<UserInfoResponse> {
    const configuration = await this.getConfiguration();

    const userInfo: UserInfoResponse = await fetchUserInfo(configuration, accessToken, expectedSubject);

    return userInfo;
  }

  private mapOpenIdUserToUser(claims: UserInfoResponse): AuthenticatedUser {
    return {
      cerbereId: claims.sub,
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
      mel: (claims.email as string) || '',
      itvCdn: (claims.itvCdn as number) ?? null,
      isExpertNational: (claims.isExpertNational as boolean) ?? false,
    };
  }

  async refreshTokens(refreshToken: string, expectedSubject: string): Promise<OIDCTokens> {
    this.logger.log('Starting token refresh');

    let configuration: Configuration;
    try {
      configuration = await this.getConfiguration();
    } catch (error) {
      this.logger.error(
        `Failed to get OIDC configuration during token refresh: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }

    let tokens: TokenEndpointResponse & TokenEndpointResponseHelpers;
    try {
      tokens = await refreshTokenGrant(configuration, refreshToken);
      this.logger.log('OIDC refresh token grant succeeded');
    } catch (error) {
      this.logger.error(
        `OIDC refresh token grant failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      throw new UnauthorizedException();
    }

    let user: AuthenticatedUser;
    try {
      // Récupérer les infos utilisateur depuis le nouveau token Cerbere
      // expectedSubject provient du JWT interne Verseau2 (cookie access_token) et non du id_token OIDC,
      // car le spec OIDC n'impose pas le retour d'un id_token lors d'un refresh grant.
      const userInfo = await this.fetchUserInfoClaims(tokens.access_token, expectedSubject);
      user = this.mapOpenIdUserToUser(userInfo);
      this.logger.log(`User info retrieved for cerbereId=${user.cerbereId}`);
    } catch (error) {
      this.logger.error(
        `Failed to fetch user info after token refresh: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException();
    }

    let itvCdn: number | null;
    let isExpertNational: boolean;
    try {
      // Re-résoudre les claims métier (peuvent avoir changé)
      ({ itvCdn, isExpertNational } = await this.resolveBusinessClaims(user.cerbereId));
    } catch (error) {
      this.logger.error(
        `Failed to resolve business claims for cerbereId=${user.cerbereId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException();
    }

    // Re-forger le JWT interne Verseau2
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.mel,
      itvCdn,
      isExpertNational,
      tokens.expires_in,
    );

    if (!tokens.refresh_token) {
      this.logger.warn('AS did not return a new refresh token');
    }

    this.logger.log('Token refresh completed successfully');

    return {
      accessToken: internalToken,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      cerbereAccessToken: tokens.access_token,
    };
  }

  private get baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    };
  }

  // 7 days in ms — conservative upper bound when the AS does not advertise refresh_token lifetime
  private readonly REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  buildCookieResponse(res: Response, tokens: OIDCTokens): void {
    // The access_token cookie must live as long as the refresh_token cookie so that
    // the browser still sends the (expired) JWT on a cold reload. The JWT's own
    // `exp` claim still enforces expiration in the auth middleware; the cookie
    // lifetime is purely a transport concern. During refresh,
    // extractSubjectFromExpiredToken() verifies the signature while allowing tokens
    // whose `exp` is up to 7 days in the past to pass verification, solely to
    // recover the subject safely when the AS does not advertise refresh token
    // lifetime.
    const cookieOptions: CookieOptions = {
      ...this.baseCookieOptions,
      maxAge: this.REFRESH_TOKEN_MAX_AGE_MS,
    };
    res.cookie('access_token', tokens.accessToken, cookieOptions);

    if (tokens.refreshToken) {
      res.cookie('refresh_token', tokens.refreshToken, cookieOptions);
    }
  }

  clearCookieResponse(res: Response): void {
    res.clearCookie('access_token', this.baseCookieOptions);
    res.clearCookie('refresh_token', this.baseCookieOptions);
  }
}
