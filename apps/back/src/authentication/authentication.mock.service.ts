import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Authentication,
  AuthenticatedUser,
  OIDCTokens,
  OIDCConfiguration,
  AuthenticatedUserAndNomPrenom,
} from './authentication';
import type { CookieOptions, Response } from 'express';
import { DroitsUserService } from '@user/droitsUser.service';
import { DataSource } from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { normalizeEmail } from '@shared/service/string.service';
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
      });
      return {
        cerbereId: (payload.sub as string) || '',
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

  async handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUserAndNomPrenom }> {
    void code;
    void nonce;
    const user = await this.getMockUser();

    const expiresIn = 3600;
    const internalToken = await this.signInternalToken(
      user.cerbereId,
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
      user.mel,
      user.itvCdn,
      user.isExpertNational,
      expiresIn,
    );

    return {
      accessToken: internalToken,
      refreshToken: internalToken,
      expiresIn,
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

  private async getMockUser(): Promise<AuthenticatedUserAndNomPrenom> {
    const mockEmail = this.configService.get<string>('OIDC_MOCK_EMAIL')?.trim();
    if (!mockEmail) {
      throw new UnauthorizedException(MOCK_AUTHENTICATION_FAILED_MESSAGE);
    }

    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { email: normalizeEmail(mockEmail) },
    });
    if (!user) {
      throw new UnauthorizedException(MOCK_AUTHENTICATION_FAILED_MESSAGE);
    }

    const [itvCdn, isExpertNational] = await Promise.all([
      this.droitsUserService.resolveItvCdn(user.sub),
      this.droitsUserService.isExpertNationalVerseau(user.sub),
    ]);

    return {
      cerbereId: user.sub,
      mel: user.email || mockEmail,
      itvCdn,
      isExpertNational,
      nom: user.nom || undefined,
      prenom: user.prenom || undefined,
    };
  }
}
