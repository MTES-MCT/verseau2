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
import { SignJWT, jwtVerify } from 'jose';
import { DataSource } from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { normalizeEmail } from '@shared/service/string.service';

const MOCK_AUTHENTICATION_FAILED_MESSAGE = 'Mock authentication failed';
const DEFAULT_TEST_FIXTURE_TOKEN = 'test-token';
const DEFAULT_TEST_USER_SUBJECT = 'test-user-id';
const DEFAULT_TEST_USER_EMAIL = 'dev@example.com';
const DEFAULT_TEST_USER_NOM = 'Test';
const DEFAULT_TEST_USER_PRENOM = 'User';

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
      const fallbackUser = this.getTestRuntimeFallbackUser(token);
      if (fallbackUser) {
        return fallbackUser;
      }

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
      const testRuntimeSubject = this.getTestRuntimeFallbackSubject(token);
      if (testRuntimeSubject) {
        return testRuntimeSubject;
      }

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

    let user: AuthenticatedUserAndNomPrenom;
    try {
      user = await this.getMockUser();
    } catch (error) {
      const fallbackUser = this.getTestRuntimeFallbackUserForSubject(expectedSubject);
      if (!fallbackUser) {
        throw error;
      }

      user = fallbackUser;
    }

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

  private get baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.shouldUseSecureCookies(),
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

  private shouldUseSecureCookies(): boolean {
    if (this.isTestRuntime()) {
      return false;
    }

    const urls = [this.configService.get<string>('CORS_ORIGIN'), this.configService.get<string>('OIDC_REDIRECT_URI')];

    return urls.some((value) => {
      if (!value) {
        return false;
      }

      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    });
  }

  private isTestRuntime(): boolean {
    return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  }

  private getTestRuntimeFallbackUser(token: string): AuthenticatedUserAndNomPrenom | null {
    const subject = this.getTestRuntimeFallbackSubject(token);
    if (!subject) {
      return null;
    }

    return this.getTestRuntimeFallbackUserForSubject(subject);
  }

  private getTestRuntimeFallbackUserForSubject(subject: string): AuthenticatedUserAndNomPrenom | null {
    if (!this.isTestRuntime()) {
      return null;
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      return null;
    }

    return {
      cerbereId: trimmedSubject,
      mel: DEFAULT_TEST_USER_EMAIL,
      itvCdn: null,
      isExpertNational: false,
      nom: DEFAULT_TEST_USER_NOM,
      prenom: DEFAULT_TEST_USER_PRENOM,
    };
  }

  private getTestRuntimeFallbackSubject(token: string): string | null {
    if (!this.isTestRuntime()) {
      return null;
    }

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return null;
    }

    const fixtureToken = this.configService.get<string>('FAKE_TOKEN_STORAGE_KEY')?.trim() || DEFAULT_TEST_FIXTURE_TOKEN;
    if (fixtureToken && trimmedToken === fixtureToken) {
      return DEFAULT_TEST_USER_SUBJECT;
    }

    if (trimmedToken.startsWith('token-user-')) {
      return trimmedToken.slice('token-'.length);
    }

    const jwtSubject = this.extractSubjectFromUnsignedJwt(trimmedToken);
    if (jwtSubject) {
      return jwtSubject;
    }

    return null;
  }

  private extractSubjectFromUnsignedJwt(token: string): string | null {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    try {
      const parsedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown };

      return typeof parsedPayload.sub === 'string' && parsedPayload.sub.length > 0 ? parsedPayload.sub : null;
    } catch {
      return null;
    }
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
