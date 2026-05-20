import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Authentication,
  AuthenticatedUser,
  OIDCTokens,
  OIDCConfiguration,
  AuthenticatedUserAndNomPrenom,
} from './authentication';
import type { Response } from 'express';
import { DroitsUserService } from '@user/droitsUser.service';
import { SignJWT, jwtVerify } from 'jose';
import { DataSource } from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { normalizeEmail } from '@shared/service/string.service';

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
    const accessToken = await this.signInternalToken(user);

    return {
      accessToken,
      refreshToken: accessToken,
      expiresIn: 3600,
      user,
    };
  }

  async refreshTokens(refreshToken: string, expectedSubject: string): Promise<OIDCTokens> {
    void refreshToken;

    const user = await this.getMockUser();
    if (user.cerbereId !== expectedSubject) {
      throw new UnauthorizedException();
    }

    const accessToken = await this.signInternalToken(user);

    return {
      accessToken,
      refreshToken: accessToken,
      expiresIn: 3600,
    };
  }

  private get baseCookieOptions() {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
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

  private async signInternalToken(user: AuthenticatedUser): Promise<string> {
    return new SignJWT({
      sub: user.cerbereId,
      email: user.mel,
      itvCdn: user.itvCdn,
      isExpertNational: user.isExpertNational,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.jwtSecret);
  }

  private async getMockUser(): Promise<AuthenticatedUserAndNomPrenom> {
    const mockEmail = this.configService.get<string>('OIDC_MOCK_EMAIL')?.trim();
    if (!mockEmail) {
      throw new UnauthorizedException('OIDC_MOCK_EMAIL is required when OIDC_MOCK=true');
    }

    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { email: normalizeEmail(mockEmail) },
    });
    if (!user) {
      throw new UnauthorizedException(`User with email ${mockEmail} not found`);
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
