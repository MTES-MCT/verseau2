/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { Authentication, OIDCTokens } from './authentication';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';
import type { CustomRequest } from '@shared/constants/customRequest';
import type { Response } from 'express';
import { loggerProviderMock } from '@shared/logger/logger.mock';

const makeResponse = (): jest.Mocked<Response> =>
  ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as unknown as jest.Mocked<Response>;

const makeRequest = (cookies: Record<string, string> = {}): CustomRequest => ({ cookies }) as unknown as CustomRequest;

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let mockAuthentication: jest.Mocked<Authentication>;
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
    } as jest.Mocked<Authentication>;

    mockUserService = {
      findOrCreateUser: jest.fn(),
      findBySub: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockDroitsUserService = {
      resolveItvCdn: jest.fn(),
      isExpertNationalVerseau: jest.fn(),
      canConsultDepot: jest.fn(),
      canConsultControle: jest.fn(),
      findIntervenantByUserSub: jest.fn(),
    } as unknown as jest.Mocked<DroitsUserService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: Authentication,
          useValue: mockAuthentication,
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
  });

  describe('logout', () => {
    it('should clear cookies', () => {
      const res = makeResponse();

      controller.logout(res);

      expect(mockAuthentication.clearCookieResponse).toHaveBeenCalledWith(res);
    });
  });

  describe('callback', () => {
    it('should throw BadRequestException when code is missing', async () => {
      const res = makeResponse();
      await expect(controller.callback('', 'nonce', '', '', res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when nonce is missing', async () => {
      const res = makeResponse();
      await expect(controller.callback('code', '', '', '', res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OIDC error is present', async () => {
      const res = makeResponse();
      await expect(controller.callback('code', 'nonce', 'access_denied', 'User denied', res)).rejects.toThrow(
        BadRequestException,
      );
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

      const result = await controller.callback('auth-code', 'nonce-abc', '', '', res);

      expect(mockAuthentication.handleCallback).toHaveBeenCalledWith('auth-code', 'nonce-abc');
      expect(mockUserService.findOrCreateUser).toHaveBeenCalledWith('user-123', {
        email: 'user@example.com',
        nom: 'Doe',
        prenom: 'John',
      });
      expect(mockAuthentication.buildCookieResponse).toHaveBeenCalled();
      expect(result).toEqual({ user: mockUser, expiresIn: 3600 });
    });
  });
});
