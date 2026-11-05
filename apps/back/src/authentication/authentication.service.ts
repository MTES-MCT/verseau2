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
  INTERNAL_TOKEN_ISSUER,
  INTERNAL_TOKEN_AUDIENCE,
} from './authentication';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/logger/logger.service';
import { SignJWT, jwtVerify } from 'jose';
import { DroitsUserService } from '@user/droitsUser.service';
import { logAuthenticationFailure } from './logAuthenticationFailure';

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
   * Contient les claims métier (sub, uid, email, itvCdn, isExpertNational).
   */
  private async signInternalToken(
    sub: string,
    uid: string,
    email: string,
    itvCdn: number | null,
    isExpertNational: boolean,
    expiresIn?: number,
  ): Promise<string> {
    const jwt = new SignJWT({ sub, uid, email, itvCdn, isExpertNational })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(INTERNAL_TOKEN_ISSUER)
      .setAudience(INTERNAL_TOKEN_AUDIENCE);

    if (expiresIn) {
      jwt.setExpirationTime(`${expiresIn}s`);
    } else {
      jwt.setExpirationTime('1h');
    }

    return jwt.sign(this.jwtSecret);
  }

  /**
   * Valide exclusivement le JWT interne signé par Verseau2.
   * Tout token non signé par JWT_SECRET est rejeté (pas de fallback Cerbere).
   */
  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: INTERNAL_TOKEN_ISSUER,
        audience: INTERNAL_TOKEN_AUDIENCE,
      });

      return this.mapInternalClaimsToUser(payload);
    } catch (error) {
      logAuthenticationFailure(this.logger, 'Token validation failed', error);
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
        issuer: INTERNAL_TOKEN_ISSUER,
        audience: INTERNAL_TOKEN_AUDIENCE,
        // Le refresh est appelé précisément quand l'access token a expiré.
        // On tolère une expiration de 7 jours (durée max du refresh token).
        clockTolerance: 7 * 24 * 60 * 60,
      });

      if (!payload.sub) {
        throw new Error('Missing sub claim');
      }

      return payload.sub;
    } catch (error) {
      logAuthenticationFailure(this.logger, 'Failed to extract subject from expired token', error);
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

  async handleCallback(
    code: string,
    nonce: string,
    codeVerifier: string,
  ): Promise<OIDCTokens & { user: AuthenticatedUserAndNomPrenom }> {
    const configuration = await this.getConfiguration();
    const callbackUrl = new URL(this.redirectUri);
    callbackUrl.searchParams.set('code', code);

    // PKCE (RFC 7636) : le code_verifier vient du cookie de transaction signé,
    // jamais du corps HTTP. Le challenge S256 correspondant a été envoyé dans
    // la requête d'autorisation via GET /auth/login.
    const tokens = await authorizationCodeGrant(configuration, callbackUrl, {
      expectedNonce: nonce,
      pkceCodeVerifier: codeVerifier,
    });

    const idTokenClaims = tokens.claims();
    if (!idTokenClaims) {
      throw new UnauthorizedException('No ID token returned by the authorization server');
    }

    const userInfo = await this.fetchUserInfoClaims(tokens.access_token, idTokenClaims.sub);
    const user = this.mapOpenIdUserToUser(userInfo);

    const { itvCdn, isExpertNational } = await this.droitsUserService.resolveVerseauAccess(user.uid);

    // Forger le JWT interne Verseau2
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.uid,
      user.mel,
      itvCdn,
      isExpertNational,
      tokens.expires_in,
    );

    const enrichedUser: AuthenticatedUserAndNomPrenom = {
      ...user,
      itvCdn,
      isExpertNational,
      nom: userInfo.family_name || undefined,
      prenom: userInfo.given_name || undefined,
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
    if (typeof claims.uid !== 'string' || !claims.uid.trim()) {
      throw new UnauthorizedException('Missing or invalid Cerbere UID');
    }
    return {
      cerbereId: claims.sub,
      uid: claims.uid.trim(),
      mel: (claims.email as string) || '',
      itvCdn: null,
      isExpertNational: false,
    };
  }

  /**
   * Mappe les claims du JWT interne Verseau2 vers AuthenticatedUser.
   * Le JWT interne contient sub, uid, email, itvCdn, isExpertNational.
   * Les autres champs (nom, prenom, etc.) ne sont pas dans le token
   * et seront résolus depuis la DB locale si nécessaire (ex: /me).
   */
  private mapInternalClaimsToUser(claims: Record<string, unknown>): AuthenticatedUser {
    if (typeof claims.uid !== 'string' || !claims.uid.trim()) {
      throw new UnauthorizedException('Missing or invalid Cerbere UID');
    }
    return {
      cerbereId: (claims.sub as string) || '',
      uid: claims.uid.trim(),
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
      this.logger.debug(
        `Failed to get OIDC configuration during token refresh: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }

    let tokens: TokenEndpointResponse & TokenEndpointResponseHelpers;
    try {
      tokens = await refreshTokenGrant(configuration, refreshToken);
      this.logger.log('OIDC refresh token grant succeeded');
    } catch (error) {
      logAuthenticationFailure(this.logger, 'OIDC refresh token grant failed', error);
      throw new UnauthorizedException();
    }

    let user: AuthenticatedUserAndNomPrenom;
    try {
      // Récupérer les infos utilisateur depuis le nouveau token Cerbere
      // expectedSubject provient du JWT interne Verseau2 (cookie access_token) et non du id_token OIDC,
      // car le spec OIDC n'impose pas le retour d'un id_token lors d'un refresh grant.
      const userInfo = await this.fetchUserInfoClaims(tokens.access_token, expectedSubject);
      user = {
        ...this.mapOpenIdUserToUser(userInfo),
        nom: userInfo.family_name || undefined,
        prenom: userInfo.given_name || undefined,
      };
      this.logger.log('User info retrieved after token refresh');
    } catch (error) {
      logAuthenticationFailure(this.logger, 'Failed to fetch user info after token refresh', error);
      throw new UnauthorizedException();
    }

    const { itvCdn, isExpertNational } = await this.droitsUserService.resolveVerseauAccess(user.uid);

    // Re-forger le JWT interne Verseau2
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.uid,
      user.mel,
      itvCdn,
      isExpertNational,
      tokens.expires_in,
    );

    if (!tokens.refresh_token) {
      this.logger.debug('AS did not return a new refresh token; keeping the existing token');
    }

    this.logger.log('Token refresh completed successfully');

    return {
      accessToken: internalToken,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      cerbereAccessToken: tokens.access_token,
      user: { ...user, itvCdn, isExpertNational },
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
