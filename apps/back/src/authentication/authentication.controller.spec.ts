/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { Authentication, OIDCTokens } from './authentication';
import { OidcTransactionService } from './oidcTransaction.service';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';
import type { CustomRequest } from '@shared/constants/customRequest';
import type { Response } from 'express';
import { loggerProviderMock } from '@shared/logger/logger.mock';

const makeResponse = (): jest.Mocked<Response> =>
  ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    set: jest.fn(),
  }) as unknown as jest.Mocked<Response>;

const makeRequest = (cookies: Record<string, string> = {}): CustomRequest => ({ cookies }) as unknown as CustomRequest;

const TRANSACTION_COOKIE = '__Host-verseau_oidc';
const TRANSACTION_STATE = 'state-abc';
const TRANSACTION_NONCE = 'nonce-from-cookie';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let mockAuthentication: jest.Mocked<Authentication>;
  let mockOidcTransaction: jest.Mocked<OidcTransactionService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockDroitsUserService: jest.Mocked<DroitsUserService>;

  beforeEach(async () => {
    mockAuthentication = {
      validateToken: jest.fn(),
      extractSubjectFromExpiredToken: jest.fn(),
      getOIDCConfiguration: jest.fn(),
      handleCallback: jest.fn(),
      refreshTokens: jest.fn(),
      buildCookieResponse: jest.fn(),
      clearCookieResponse: jest.fn(),
    };

    mockUserService = {
      findOrCreateUser: jest.fn(),
      findBySub: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockDroitsUserService = {
      resolveVerseauAccess: jest.fn(),
      resolveItvCdn: jest.fn(),
      isExpertNationalVerseau: jest.fn(),
      canConsultDepot: jest.fn(),
      canConsultControle: jest.fn(),
      findIntervenantByUserSub: jest.fn(),
    } as unknown as jest.Mocked<DroitsUserService>;

    mockOidcTransaction = {
      cookieName: TRANSACTION_COOKIE,
      createTransaction: jest.fn(),
      verifyTransactionToken: jest.fn(),
      readTransactionToken: jest.fn((cookies: unknown) => {
        if (typeof cookies !== 'object' || cookies === null) {
          return undefined;
        }
        const token = (cookies as Record<string, unknown>)[TRANSACTION_COOKIE];
        return typeof token === 'string' ? token : undefined;
      }),
      setTransactionCookie: jest.fn(),
      clearTransactionCookie: jest.fn(),
    } as unknown as jest.Mocked<OidcTransactionService>;
    mockOidcTransaction.verifyTransactionToken.mockResolvedValue({
      state: TRANSACTION_STATE,
      nonce: TRANSACTION_NONCE,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: Authentication,
          useValue: mockAuthentication,
        },
        {
          provide: OidcTransactionService,
          useValue: mockOidcTransaction,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: DroitsUserService,
          useValue: mockDroitsUserService,
        },
        loggerProviderMock,
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refresh', () => {
    it('should throw BadRequestException when refresh token cookie is missing', async () => {
      const req = makeRequest({});
      const res = makeResponse();

      await expect(controller.refresh(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when access token cookie is missing', async () => {
      const req = makeRequest({ refresh_token: 'old-refresh-token' });
      const res = makeResponse();

      await expect(controller.refresh(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when access token signature verification fails', async () => {
      const req = makeRequest({ refresh_token: 'old-refresh-token', access_token: 'forged-or-invalid-token' });
      const res = makeResponse();
      mockAuthentication.extractSubjectFromExpiredToken.mockRejectedValue(new UnauthorizedException());

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    });

    it('should set updated cookie when the AS returns a new refresh token (rotation)', async () => {
      const req = makeRequest({ refresh_token: 'old-refresh-token', access_token: 'internal-jwt' });
      const res = makeResponse();
      mockAuthentication.extractSubjectFromExpiredToken.mockResolvedValue('user-123');

      const refreshedTokens: OIDCTokens = {
        accessToken: 'new-internal-jwt',
        refreshToken: 'new-refresh-token', // AS rotated the token
        expiresIn: 3600,
        cerbereAccessToken: 'new-cerbere-token',
      };
      mockAuthentication.refreshTokens.mockResolvedValue(refreshedTokens);

      const result = await controller.refresh(req, res);

      expect(mockAuthentication.refreshTokens).toHaveBeenCalledWith('old-refresh-token', 'user-123');
      expect(mockAuthentication.buildCookieResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ refreshToken: 'new-refresh-token' }),
      );
      expect(result).toEqual({ expiresIn: 3600 });
    });

    it('should fall back to old refresh token when the AS does not return a new one (no rotation)', async () => {
      const req = makeRequest({ refresh_token: 'old-refresh-token', access_token: 'internal-jwt' });
      const res = makeResponse();
      mockAuthentication.extractSubjectFromExpiredToken.mockResolvedValue('user-123');

      const refreshedTokens: OIDCTokens = {
        accessToken: 'new-internal-jwt',
        refreshToken: undefined, // AS did NOT issue a new refresh token
        expiresIn: 3600,
        cerbereAccessToken: 'new-cerbere-token',
      };
      mockAuthentication.refreshTokens.mockResolvedValue(refreshedTokens);

      await controller.refresh(req, res);

      // The old refresh token must be reused so the user stays logged in
      expect(mockAuthentication.buildCookieResponse).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ refreshToken: 'old-refresh-token' }),
      );
    });

    it('should throw UnauthorizedException when refreshTokens rejects (invalid grant / rotation enforced)', async () => {
      const req = makeRequest({ refresh_token: 'expired-or-revoked-token', access_token: 'internal-jwt' });
      const res = makeResponse();
      mockAuthentication.extractSubjectFromExpiredToken.mockResolvedValue('user-123');

      mockAuthentication.refreshTokens.mockRejectedValue(new Error('invalid_grant'));

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthentication.buildCookieResponse).not.toHaveBeenCalled();
    });

    it('préserve le 403 et nettoie les cookies lorsque les droits ont été retirés', async () => {
      const req = makeRequest({ refresh_token: 'refresh-token', access_token: 'internal-jwt' });
      const res = makeResponse();
      mockAuthentication.extractSubjectFromExpiredToken.mockResolvedValue('user-123');
      mockAuthentication.refreshTokens.mockRejectedValue(new ForbiddenException({ code: 'VERSEAU_ACCESS_DENIED' }));

      await expect(controller.refresh(req, res)).rejects.toMatchObject({ status: 403 });
      expect(mockAuthentication.clearCookieResponse).toHaveBeenCalledWith(res);
    });

    it('préserve le 503 sans nettoyer la session lors d’une indisponibilité du référentiel', async () => {
      const req = makeRequest({ refresh_token: 'refresh-token', access_token: 'internal-jwt' });
      const res = makeResponse();
      mockAuthentication.extractSubjectFromExpiredToken.mockResolvedValue('user-123');
      mockAuthentication.refreshTokens.mockRejectedValue(new ServiceUnavailableException());

      await expect(controller.refresh(req, res)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(mockAuthentication.clearCookieResponse).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear cookies', () => {
      const res = makeResponse();

      controller.logout(res);

      expect(mockAuthentication.clearCookieResponse).toHaveBeenCalledWith(res);
    });
  });

  describe('login', () => {
    it('should return server-generated state/nonce and set the transaction cookie', async () => {
      const res = makeResponse();
      mockAuthentication.getOIDCConfiguration.mockResolvedValue({
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid profile',
      });
      mockOidcTransaction.createTransaction.mockResolvedValue({
        state: TRANSACTION_STATE,
        nonce: TRANSACTION_NONCE,
        token: 'signed-transaction-token',
      });

      const result = await controller.login(res);

      expect(result).toEqual(expect.objectContaining({ state: TRANSACTION_STATE, nonce: TRANSACTION_NONCE }));
      expect(mockOidcTransaction.setTransactionCookie).toHaveBeenCalledWith(res, 'signed-transaction-token');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    });
  });

  describe('callback', () => {
    const validCookies = { [TRANSACTION_COOKIE]: 'signed-transaction-token' };

    it('should throw BadRequestException when code is missing', async () => {
      const res = makeResponse();
      await expect(controller.callback('', TRANSACTION_STATE, '', '', makeRequest(validCookies), res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when state is missing', async () => {
      const res = makeResponse();
      await expect(controller.callback('code', '', '', '', makeRequest(validCookies), res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when OIDC error is present', async () => {
      const res = makeResponse();
      await expect(
        controller.callback('code', TRANSACTION_STATE, 'access_denied', 'User denied', makeRequest(validCookies), res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when the transaction cookie is missing or invalid', async () => {
      const res = makeResponse();
      mockOidcTransaction.verifyTransactionToken.mockRejectedValueOnce(new UnauthorizedException());

      await expect(controller.callback('auth-code', TRANSACTION_STATE, '', '', makeRequest({}), res)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockOidcTransaction.clearTransactionCookie).not.toHaveBeenCalled();
      expect(mockAuthentication.handleCallback).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when state does not match the transaction (login CSRF)', async () => {
      const res = makeResponse();

      await expect(
        controller.callback('attacker-code', 'attacker-state', '', '', makeRequest(validCookies), res),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockOidcTransaction.clearTransactionCookie).not.toHaveBeenCalled();
      expect(mockAuthentication.handleCallback).not.toHaveBeenCalled();
    });

    it('should set cookies and return user on successful callback', async () => {
      const res = makeResponse();
      const mockUser = {
        cerbereId: 'user-123',
        mel: 'user@example.com',
        itvCdn: null,
        isExpertNational: false,
        nom: 'Doe',
        prenom: 'John',
      };
      mockAuthentication.handleCallback.mockResolvedValue({
        accessToken: 'internal-jwt',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        user: mockUser,
      });
      mockUserService.findOrCreateUser.mockResolvedValue({} as never);

      const result = await controller.callback('auth-code', TRANSACTION_STATE, '', '', makeRequest(validCookies), res);

      // Le nonce utilisé vient du cookie vérifié, jamais du corps HTTP.
      expect(mockAuthentication.handleCallback).toHaveBeenCalledWith('auth-code', TRANSACTION_NONCE);
      expect(mockOidcTransaction.clearTransactionCookie).toHaveBeenCalledWith(res);
      expect(mockUserService.findOrCreateUser).toHaveBeenCalledWith('user-123', {
        email: 'user@example.com',
        nom: 'Doe',
        prenom: 'John',
      });
      expect(mockAuthentication.buildCookieResponse).toHaveBeenCalled();
      expect(result).toEqual({ user: mockUser, expiresIn: 3600 });
    });

    it('should clear the transaction cookie when the OIDC exchange fails', async () => {
      const res = makeResponse();
      mockAuthentication.handleCallback.mockRejectedValueOnce(new Error('invalid_grant'));

      await expect(
        controller.callback('auth-code', TRANSACTION_STATE, '', '', makeRequest(validCookies), res),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockOidcTransaction.clearTransactionCookie).toHaveBeenCalledWith(res);
      expect(mockAuthentication.buildCookieResponse).not.toHaveBeenCalled();
    });

    it('préserve le 403, nettoie la session et ne synchronise pas le compte refusé', async () => {
      const res = makeResponse();
      mockAuthentication.handleCallback.mockRejectedValue(new ForbiddenException({ code: 'VERSEAU_ACCESS_DENIED' }));

      await expect(
        controller.callback('auth-code', TRANSACTION_STATE, '', '', makeRequest(validCookies), res),
      ).rejects.toMatchObject({ status: 403 });

      expect(mockAuthentication.clearCookieResponse).toHaveBeenCalledWith(res);
      expect(mockUserService.findOrCreateUser).not.toHaveBeenCalled();
      expect(mockAuthentication.buildCookieResponse).not.toHaveBeenCalled();
    });
  });
});
