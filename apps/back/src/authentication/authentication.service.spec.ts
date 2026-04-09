/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from './authentication';

// Mock external modules
jest.mock('openid-client', () => ({
  Configuration: jest.fn(),
  discovery: jest.fn(),
  authorizationCodeGrant: jest.fn(),
  refreshTokenGrant: jest.fn(),
  fetchUserInfo: jest.fn(),
}));

const mockSign = jest.fn().mockResolvedValue('mock-internal-jwt');
const mockSetProtectedHeader = jest.fn().mockReturnThis();
const mockSetIssuedAt = jest.fn().mockReturnThis();
const mockSetExpirationTime = jest.fn().mockReturnThis();

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: mockSetProtectedHeader,
    setIssuedAt: mockSetIssuedAt,
    setExpirationTime: mockSetExpirationTime,
    sign: mockSign,
  })),
}));

import { discovery, authorizationCodeGrant, refreshTokenGrant, fetchUserInfo } from 'openid-client';
import { jwtVerify } from 'jose';

const mockServerMetadata = {
  issuer: 'https://auth.example.com',
  authorization_endpoint: 'https://auth.example.com/authorize',
  jwks_uri: 'https://auth.example.com/.well-known/jwks.json',
  end_session_endpoint: 'https://auth.example.com/logout',
};

const mockConfiguration = {
  serverMetadata: jest.fn().mockReturnValue(mockServerMetadata),
};

const JWT_SECRET = 'unsupersecret';

// Builder for creating AuthenticatedUser test objects
const createAuthenticatedUser = (user: Partial<AuthenticatedUser> = {}): AuthenticatedUser => {
  return {
    cerbereId: '',
    mel: '',
    itvCdn: null,
    isExpertNational: false,
    ...user,
  };
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockDroitsUserService: jest.Mocked<DroitsUserService>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // discovery() resolves to a mock configuration by default
    (discovery as jest.Mock).mockResolvedValue(mockConfiguration);

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'OIDC_REDIRECT_URI') return 'https://app.example.com/api/auth/callback';
        if (key === 'OIDC_CLIENT_ID') return 'test-client-id';
        if (key === 'OIDC_CLIENT_SECRET') return 'test-client-secret';
        if (key === 'OIDC_ISSUER_URL') return 'https://auth.example.com';
        if (key === 'JWT_SECRET') return JWT_SECRET;
        throw new Error(`Config key ${key} not found`);
      }),
    } as unknown as jest.Mocked<ConfigService>;

    // Mock LoggerService
    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    // Mock DroitsUserService
    mockDroitsUserService = {
      resolveItvCdn: jest.fn().mockResolvedValue(null),
      isExpertNationalVerseau: jest.fn().mockResolvedValue(false),
      canConsultDepot: jest.fn(),
      canConsultControle: jest.fn(),
      findIntervenantByUserSub: jest.fn(),
    } as unknown as jest.Mocked<DroitsUserService>;

    // Reset serverMetadata to default for each test
    mockConfiguration.serverMetadata.mockReturnValue(mockServerMetadata);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: DroitsUserService,
          useValue: mockDroitsUserService,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateToken', () => {
    it('should successfully validate an internal JWT token', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          sub: 'user-123',
          email: 'john.doe@example.com',
          itvCdn: 42,
          isExpertNational: true,
        },
      });

      const result = await service.validateToken('mock.jwt.token');

      expect(jwtVerify).toHaveBeenCalledWith('mock.jwt.token', expect.any(Uint8Array), { algorithms: ['HS256'] });
      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: 'user-123',
          mel: 'john.doe@example.com',
          itvCdn: 42,
          isExpertNational: true,
        }),
      );
    });

    it('should reject a token that fails verification (no fallback)', async () => {
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('signature verification failed'));

      await expect(service.validateToken('invalid.jwt.token')).rejects.toThrow(UnauthorizedException);

      // Detailed error is logged server-side
      expect(mockLogger.error).toHaveBeenCalledWith('Token validation failed: signature verification failed');
      // fetchUserInfo should NOT be called — no fallback to Cerbere
      expect(fetchUserInfo).not.toHaveBeenCalled();
    });

    it('should handle missing optional fields in handleCallback', async () => {
      const minimalUserInfo = {
        sub: 'user-minimal',
        preferred_username: 'minimal.user',
        usual_name: 'User',
        given_name: 'Minimal',
        email: 'minimal@example.com',
        cerbere_matricule: 'MIN001',
      };

      const mockTokens = {
        access_token: 'mock-access-token',
        id_token: 'mock-id-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        claims: () => ({ sub: 'user-minimal', iss: 'https://auth.example.com', aud: 'test-client-id', exp: 0, iat: 0 }),
      };

      (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);
      (fetchUserInfo as jest.Mock).mockResolvedValue(minimalUserInfo);

      const result = await service.handleCallback('mock-code', 'mock-nonce');

      expect(fetchUserInfo).toHaveBeenCalledWith(mockConfiguration, 'mock-access-token', 'user-minimal');
      expect(result.user).toEqual(
        expect.objectContaining({
          cerbereId: 'user-minimal',
          mel: 'minimal@example.com',
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'refresh-token-abc';

    it('should refresh tokens and re-forge internal JWT with updated claims', async () => {
      const mockRefreshedTokens = {
        access_token: 'new-cerbere-access-token',
        id_token: 'new-id-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };
      const mockUserInfo = {
        sub: 'user-123',
        preferred_username: 'john.doe',
        usual_name: 'Doe',
        given_name: 'John',
        email: 'john.doe@example.com',
        cerbere_matricule: 'MAT123',
      };

      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshedTokens);
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);
      mockDroitsUserService.resolveItvCdn.mockResolvedValue(42);
      mockDroitsUserService.isExpertNationalVerseau.mockResolvedValue(true);

      const result = await service.refreshTokens(mockRefreshToken, 'user-123');

      expect(refreshTokenGrant).toHaveBeenCalledWith(mockConfiguration, mockRefreshToken);
      expect(fetchUserInfo).toHaveBeenCalledWith(mockConfiguration, 'new-cerbere-access-token', 'user-123');
      expect(mockDroitsUserService.resolveItvCdn).toHaveBeenCalledWith('user-123');
      expect(mockDroitsUserService.isExpertNationalVerseau).toHaveBeenCalledWith('user-123');

      // Le token retourné est un JWT interne (pas le token Cerbere)
      expect(result.accessToken).toBe('mock-internal-jwt');
      expect(result.cerbereAccessToken).toBe('new-cerbere-access-token');
      expect(result.idToken).toBe('new-id-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresIn).toBe(3600);
    });

    it('should succeed even when no ID token is returned (sub comes from expectedSubject parameter)', async () => {
      const mockRefreshedTokens = {
        access_token: 'new-access-token',
        id_token: undefined,
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };
      const mockUserInfo = { sub: 'user-123', email: 'test@example.com' };

      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshedTokens);
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

      const result = await service.refreshTokens(mockRefreshToken, 'user-123');

      expect(fetchUserInfo).toHaveBeenCalledWith(mockConfiguration, 'new-access-token', 'user-123');
      expect(result.accessToken).toBe('mock-internal-jwt');
      expect(result.idToken).toBe('');
    });

    it('should propagate errors from refreshTokenGrant as generic 401', async () => {
      (refreshTokenGrant as jest.Mock).mockRejectedValue(new Error('Invalid refresh token'));

      await expect(service.refreshTokens(mockRefreshToken, 'user-123')).rejects.toThrow(UnauthorizedException);

      // Detailed error is logged server-side (message + original error object)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OIDC refresh token grant failed: Invalid refresh token',
        expect.any(Error),
      );
    });
  });

  describe('generateLogoutUrl', () => {
    const mockIdToken = 'id-token-xyz';

    it('should generate correct logout URL with id_token_hint', async () => {
      const logoutUrl = await service.generateLogoutUrl(mockIdToken);

      expect(logoutUrl).toBe(
        'https://auth.example.com/logout?id_token_hint=id-token-xyz&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com',
      );
    });

    it('should throw error when end_session_endpoint is missing', async () => {
      mockConfiguration.serverMetadata.mockReturnValue({
        ...mockServerMetadata,
        end_session_endpoint: undefined,
      });

      await expect(service.generateLogoutUrl(mockIdToken)).rejects.toThrow('End session endpoint not available');
    });

    it('should correctly strip /api/auth/callback from redirect URI', async () => {
      const logoutUrl = await service.generateLogoutUrl(mockIdToken);
      const url = new URL(logoutUrl);
      const postLogoutRedirect = url.searchParams.get('post_logout_redirect_uri');

      expect(postLogoutRedirect).toBe('https://app.example.com');
      expect(postLogoutRedirect).not.toContain('/api/auth/callback');
    });
  });

  describe('lazy discovery', () => {
    const mockRefreshTokensResponse = {
      access_token: 'new-access-token',
      id_token: 'new-id-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
    };

    it('should call discovery() only once and reuse the configuration', async () => {
      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshTokensResponse);
      (fetchUserInfo as jest.Mock).mockResolvedValue({ sub: 'u1' });

      await service.refreshTokens('rt1', 'u1');
      await service.refreshTokens('rt2', 'u1');

      expect(discovery).toHaveBeenCalledTimes(1);
    });

    it('should throw ServiceUnavailableException when discovery fails', async () => {
      (discovery as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      await expect(service.refreshTokens('rt', 'u1')).rejects.toMatchObject({
        message: 'OIDC provider unreachable: Connection refused',
      });
    });

    it('should retry discovery on next request after a failure', async () => {
      (discovery as jest.Mock)
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(mockConfiguration);
      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshTokensResponse);
      (fetchUserInfo as jest.Mock).mockResolvedValue({ sub: 'u1' });

      // First call fails
      await expect(service.refreshTokens('rt', 'u1')).rejects.toThrow();
      // Second call succeeds (discovery retried)
      const result = await service.refreshTokens('rt', 'u1');
      expect(result.accessToken).toBe('mock-internal-jwt');
      expect(discovery).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildCookieResponse', () => {
    it('should set access_token and refresh_token cookies', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as import('express').Response;

      service.buildCookieResponse(mockRes, {
        accessToken: 'internal-jwt',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        'internal-jwt',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 3600 * 1000,
        }),
      );

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should not set refresh_token cookie when refreshToken is absent', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as import('express').Response;

      service.buildCookieResponse(mockRes, {
        accessToken: 'internal-jwt',
        idToken: 'id-token',
        expiresIn: 3600,
      });

      expect(mockRes.cookie).toHaveBeenCalledTimes(1);
      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'internal-jwt', expect.anything());
    });
  });

  describe('refreshTokens — rotation logging', () => {
    const mockRefreshToken = 'old-refresh-token';

    it('should warn when the AS does not return a new refresh token', async () => {
      const mockRefreshedTokens = {
        access_token: 'new-cerbere-access-token',
        id_token: 'new-id-token',
        refresh_token: undefined,
        expires_in: 3600,
      };
      const mockUserInfo = { sub: 'user-123', email: 'test@example.com' };

      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshedTokens);
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

      await service.refreshTokens(mockRefreshToken, 'user-123');

      expect(mockLogger.warn).toHaveBeenCalledWith('AS did not return a new refresh token');
    });

    it('should NOT warn when the AS returns a new refresh token', async () => {
      const mockRefreshedTokens = {
        access_token: 'new-cerbere-access-token',
        id_token: 'new-id-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };
      const mockUserInfo = { sub: 'user-123', email: 'test@example.com' };

      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshedTokens);
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

      await service.refreshTokens(mockRefreshToken, 'user-123');

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
