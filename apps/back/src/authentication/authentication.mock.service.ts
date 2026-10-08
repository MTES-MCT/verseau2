import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Authentication,
  AuthenticatedUser,
  OIDCTokens,
  OIDCConfiguration,
  AuthenticatedUserAndNomPrenom,
  INTERNAL_TOKEN_ISSUER,
  INTERNAL_TOKEN_AUDIENCE,
} from './authentication';
import type { CookieOptions, Response } from 'express';
import { DroitsUserService } from '@user/droitsUser.service';
import { DataSource } from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { SignJWT, jwtVerify } from 'jose';

const MOCK_AUTHENTICATION_FAILED_MESSAGE = 'Mock authentication failed';

@Injectable()
export class AuthenticationMockService implements Authentication {
  private readonly jwtSecret: Uint8Array;

  constructor(
    private readonly configService: ConfigService,
    private readonly droitsUserService: DroitsUserService,
    private readonly dataSource: DataSource,
  ) {
    this.jwtSecret = new TextEncoder().encode(this.configService.getOrThrow<string>('JWT_SECRET'));
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    if (!token?.trim()) {
      throw new UnauthorizedException();
    }

    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: INTERNAL_TOKEN_ISSUER,
        audience: INTERNAL_TOKEN_AUDIENCE,
      });
      if (typeof payload.uid !== 'string' || !payload.uid.trim()) {
        throw new UnauthorizedException();
      }
      return {
        cerbereId: (payload.sub as string) || '',
        uid: payload.uid.trim(),
        mel: (payload.email as string) || '',
        itvCdn: (payload.itvCdn as number) ?? null,
        isExpertNational: (payload.isExpertNational as boolean) ?? false,
      };
    } catch {
      throw new UnauthorizedException();
    }
  }

  async extractSubjectFromExpiredToken(token: string): Promise<string> {
    if (!token?.trim()) {
      throw new UnauthorizedException();
    }

    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: INTERNAL_TOKEN_ISSUER,
        audience: INTERNAL_TOKEN_AUDIENCE,
        clockTolerance: 7 * 24 * 60 * 60,
      });
      if (!payload.sub) {
        throw new UnauthorizedException();
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException();
    }
  }

  getOIDCConfiguration(): Promise<OIDCConfiguration> {
    return Promise.resolve({
      authorizationEndpoint: 'http://localhost:5173/mock_authorization',
      clientId: 'mock-client-id',
      redirectUri: 'http://localhost:5173/dashboard',
      scope: 'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations',
    });
  }

  async handleCallback(
    code: string,
    nonce: string,
    codeVerifier: string,
  ): Promise<OIDCTokens & { user: AuthenticatedUserAndNomPrenom }> {
    void code;
    void nonce;
    void codeVerifier;
    const user = await this.getMockUser();

    const expiresIn = 3600;
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.uid,
      user.mel,
      user.itvCdn,
      user.isExpertNational,
      expiresIn,
    );

    return {
      accessToken: internalToken,
      refreshToken: internalToken,
      expiresIn,
      user,
    };
  }

  async refreshTokens(refreshToken: string, expectedSubject: string): Promise<OIDCTokens> {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException();
    }

    const user = await this.getMockUser();
    if (user.cerbereId !== expectedSubject) {
      throw new UnauthorizedException();
    }

    const expiresIn = 3600;
    const internalToken = await this.signInternalToken(
      user.cerbereId,
      user.uid,
      user.mel,
      user.itvCdn,
      user.isExpertNational,
      expiresIn,
    );

    return {
      accessToken: internalToken,
      refreshToken: internalToken,
      expiresIn,
      user,
    };
  }

  private get baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    };
  }

  buildCookieResponse(res: Response, tokens: OIDCTokens): void {
    // In mock, set cookies similarly to real implementation for tests
    res.cookie('access_token', tokens.accessToken, this.baseCookieOptions);

    if (tokens.refreshToken) {
      res.cookie('refresh_token', tokens.refreshToken, this.baseCookieOptions);
    }
  }

  clearCookieResponse(res: Response): void {
    res.clearCookie('access_token', this.baseCookieOptions);
    res.clearCookie('refresh_token', this.baseCookieOptions);
  }

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

  private async getMockUser(): Promise<AuthenticatedUserAndNomPrenom> {
    const mockUid = this.configService.get<string>('OIDC_MOCK_UID')?.trim();
    if (!mockUid) {
      throw new UnauthorizedException(MOCK_AUTHENTICATION_FAILED_MESSAGE);
    }

    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { uid: mockUid },
    });
    if (!user) {
      throw new UnauthorizedException(MOCK_AUTHENTICATION_FAILED_MESSAGE);
    }

    const { itvCdn, isExpertNational } = await this.droitsUserService.resolveVerseauAccess(user.uid);

    return {
      cerbereId: user.sub,
      uid: user.uid,
      mel: user.email || '',
      itvCdn,
      isExpertNational,
      nom: user.nom || undefined,
      prenom: user.prenom || undefined,
    };
  }
}
