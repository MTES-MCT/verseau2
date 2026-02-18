import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';
import { LoggerService } from '@shared/logger/logger.service';
import type { JWTPayload } from 'jose';

const mockServerMetadata = {
  issuer: 'https://auth.example.com',
  authorization_endpoint: 'https://auth.example.com/authorize',
  jwks_uri: 'https://auth.example.com/.well-known/jwks.json',
  end_session_endpoint: 'https://auth.example.com/logout',
};

const mockConfiguration = {
  serverMetadata: jest.fn().mockReturnValue(mockServerMetadata),
};

// Mock external modules
jest.mock('openid-client', () => ({
  Configuration: jest.fn(),
  discovery: jest.fn(),
  authorizationCodeGrant: jest.fn(),
  refreshTokenGrant: jest.fn(),
  fetchUserInfo: jest.fn(),
  skipSubjectCheck: Symbol('skipSubjectCheck'),
}));

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  createRemoteJWKSet: jest.fn(),
}));

import { discovery, authorizationCodeGrant, refreshTokenGrant, fetchUserInfo } from 'openid-client';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { AuthenticatedUser } from './authentication';

// Builder for creating JWTPayload test objects
const createJWTPayload = (payload: Partial<JWTPayload> = {}): JWTPayload => {
  return payload as JWTPayload;
};

// Builder for creating AuthenticatedUser test objects
const createAuthenticatedUser = (user: Partial<AuthenticatedUser> = {}): AuthenticatedUser => {
  return {
    cerbereId: '',
    login: '',
    nom: '',
    prenom: '',
    mel: '',
    matricule: '',
    ...user,
  };
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<LoggerService>;

  const mockJWKS = jest.fn();

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // discovery() resolves to a mock configuration by default
    (discovery as jest.Mock).mockResolvedValue(mockConfiguration);

    // Mock ConfigService
    mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'OIDC_REDIRECT_URI') return 'https://app.example.com/api/auth/callback';
        if (key === 'OIDC_CLIENT_ID') return 'test-client-id';
        if (key === 'OIDC_CLIENT_SECRET') return 'test-client-secret';
        if (key === 'OIDC_ISSUER_URL') return 'https://auth.example.com';
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

    // Mock createRemoteJWKSet
    (createRemoteJWKSet as jest.Mock).mockReturnValue(mockJWKS);

    // Reset serverMetadata to default for each test
    (mockConfiguration.serverMetadata as jest.Mock).mockReturnValue(mockServerMetadata);

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
    const mockToken = 'mock.jwt.token';
    const mockPayload = createJWTPayload({
      sub: 'user-123',
      preferred_username: 'john.doe',
      usual_name: 'Doe',
      given_name: 'John',
      email: 'john.doe@example.com',
      cerbere_matricule: 'MAT123',
    });

    it('should successfully validate JWT token via local verification', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const result = await service.validateToken(mockToken);

      expect(jwtVerify).toHaveBeenCalledWith(mockToken, mockJWKS, {
        issuer: mockServerMetadata.issuer,
        audience: 'test-client-id',
      });
      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: 'user-123',
          login: 'john.doe',
          nom: 'Doe',
          prenom: 'John',
          mel: 'john.doe@example.com',
          matricule: 'MAT123',
        }),
      );
    });

    it('should fall back to getUserInfo when JWT verification fails', async () => {
      const mockUserInfo = createJWTPayload({
        sub: 'user-456',
        uid: 'jane.smith',
        family_name: 'Smith',
        given_name: 'Jane',
        email: 'jane.smith@example.com',
      });

      (jwtVerify as jest.Mock).mockRejectedValue(new Error('JWT verification failed'));
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

      const result = await service.validateToken(mockToken);

      expect(jwtVerify).toHaveBeenCalled();
      expect(fetchUserInfo).toHaveBeenCalledWith(mockConfiguration, mockToken, expect.any(Symbol));
      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: 'user-456',
          login: 'jane.smith',
          nom: 'Smith',
          prenom: 'Jane',
          mel: 'jane.smith@example.com',
          matricule: 'user-456',
        }),
      );
    });

    it('should throw error when both JWT verification and getUserInfo fail', async () => {
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('JWT verification failed'));
      (fetchUserInfo as jest.Mock).mockRejectedValue(new Error('UserInfo fetch failed'));

      await expect(service.validateToken(mockToken)).rejects.toThrow('Token validation failed: UserInfo fetch failed');
    });

    it('should create JWKS only once and reuse it', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      await service.validateToken(mockToken);
      await service.validateToken(mockToken);

      // createRemoteJWKSet should be called only once
      expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
      expect(createRemoteJWKSet).toHaveBeenCalledWith(new URL(mockServerMetadata.jwks_uri));
    });
  });

  describe('getOIDCConfiguration', () => {
    it('should return correct OIDC configuration', async () => {
      const config = await service.getOIDCConfiguration();

      expect(config).toEqual({
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/api/auth/callback',
        scope: 'openid profile identite_pivot email cerbere_utilisateur cerbere_description cerbere_autorisations',
      });
    });

    it('should throw error when authorization endpoint is missing', async () => {
      (mockConfiguration.serverMetadata as jest.Mock).mockReturnValue({
        ...mockServerMetadata,
        authorization_endpoint: undefined,
      });

      await expect(service.getOIDCConfiguration()).rejects.toThrow('Authorization endpoint not available');
    });
  });

  describe('handleCallback', () => {
    const mockCode = 'auth-code-123';
    const mockNonce = 'nonce-456';
    const mockTokens = {
      access_token: 'access-token-123',
      id_token: 'id-token-456',
      refresh_token: 'refresh-token-789',
      expires_in: 3600,
    };
    const mockUserInfo = createJWTPayload({
      sub: 'user-123',
      preferred_username: 'john.doe',
      usual_name: 'Doe',
      given_name: 'John',
      email: 'john.doe@example.com',
      cerbere_matricule: 'MAT123',
    });

    it('should successfully exchange authorization code for tokens and retrieve user info', async () => {
      (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

      const result = await service.handleCallback(mockCode, mockNonce);

      expect(authorizationCodeGrant).toHaveBeenCalledWith(
        mockConfiguration,
        expect.objectContaining({
          searchParams: expect.any(Object) as URLSearchParams,
        }),
        {
          expectedNonce: mockNonce,
          pkceCodeVerifier: undefined,
        },
      );

      const callbackUrl = (authorizationCodeGrant as jest.Mock).mock.calls[0]?.[1] as URL;
      expect(callbackUrl?.searchParams.get('code')).toBe(mockCode);

      expect(fetchUserInfo).toHaveBeenCalledWith(mockConfiguration, 'access-token-123', expect.any(Symbol));

      expect(result).toEqual({
        accessToken: 'access-token-123',
        idToken: 'id-token-456',
        refreshToken: 'refresh-token-789',
        expiresIn: 3600,
        user: createAuthenticatedUser({
          cerbereId: 'user-123',
          login: 'john.doe',
          nom: 'Doe',
          prenom: 'John',
          mel: 'john.doe@example.com',
          matricule: 'MAT123',
        }),
      });
    });

    it('should propagate errors from authorizationCodeGrant', async () => {
      (authorizationCodeGrant as jest.Mock).mockRejectedValue(new Error('Invalid authorization code'));

      await expect(service.handleCallback(mockCode, mockNonce)).rejects.toThrow('Invalid authorization code');
    });
  });

  describe('getUserInfo', () => {
    const mockAccessToken = 'access-token-123';
    const mockUserInfo = createJWTPayload({
      sub: 'user-789',
      preferred_username: 'alice.wonder',
      usual_name: 'Wonder',
      given_name: 'Alice',
      email: 'alice@example.com',
      cerbere_matricule: 'MAT789',
      organizational_unit: 'IT Department',
      email_metier: 'alice.work@example.com',
      cerbere_description: 'Senior Developer',
      cerbere_mobile: '+33612345678',
      phone_number: '+33123456789',
      cerbere_profils: ['ADMIN;NATIONAL;'],
      cerbere_roles: ['ROLE_ADMIN', 'ROLE_USER'],
    });

    it('should successfully fetch and map user info from access token', async () => {
      (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

      const result = await service.getUserInfo(mockAccessToken);

      expect(fetchUserInfo).toHaveBeenCalledWith(mockConfiguration, mockAccessToken, expect.any(Symbol));
      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: 'user-789',
          login: 'alice.wonder',
          nom: 'Wonder',
          prenom: 'Alice',
          mel: 'alice@example.com',
          matricule: 'MAT789',
          unite: 'IT Department',
          emailMetier: 'alice.work@example.com',
          description: 'Senior Developer',
          mobile: '+33612345678',
          telephone: '+33123456789',
          profils: ['ADMIN;NATIONAL;'],
          roles: ['ROLE_ADMIN', 'ROLE_USER'],
        }),
      );
    });

    it('should handle alternative claim names for login', async () => {
      const userInfoWithUid = createJWTPayload({
        sub: 'user-999',
        uid: 'bob.builder',
        family_name: 'Builder',
        given_name: 'Bob',
        email: 'bob@example.com',
      });

      (fetchUserInfo as jest.Mock).mockResolvedValue(userInfoWithUid);

      const result = await service.getUserInfo(mockAccessToken);

      expect(result.login).toBe('bob.builder');
      expect(result.nom).toBe('Builder');
    });

    it('should handle missing optional fields', async () => {
      const minimalUserInfo = createJWTPayload({
        sub: 'user-minimal',
        preferred_username: 'minimal.user',
        usual_name: 'User',
        given_name: 'Minimal',
        email: 'minimal@example.com',
        cerbere_matricule: 'MIN001',
      });

      (fetchUserInfo as jest.Mock).mockResolvedValue(minimalUserInfo);

      const result = await service.getUserInfo(mockAccessToken);

      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: 'user-minimal',
          login: 'minimal.user',
          nom: 'User',
          prenom: 'Minimal',
          mel: 'minimal@example.com',
          matricule: 'MIN001',
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'refresh-token-abc';

    it('should successfully refresh tokens using refresh token', async () => {
      const mockRefreshedTokens = {
        access_token: 'new-access-token',
        id_token: 'new-id-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshedTokens);

      const result = await service.refreshTokens(mockRefreshToken);

      expect(refreshTokenGrant).toHaveBeenCalledWith(mockConfiguration, mockRefreshToken);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });
    });

    it('should handle missing id_token in response', async () => {
      const mockRefreshedTokens = {
        access_token: 'new-access-token',
        id_token: undefined,
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      (refreshTokenGrant as jest.Mock).mockResolvedValue(mockRefreshedTokens);

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result.idToken).toBe('');
    });

    it('should propagate errors from refreshTokenGrant', async () => {
      (refreshTokenGrant as jest.Mock).mockRejectedValue(new Error('Invalid refresh token'));

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
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
      (mockConfiguration.serverMetadata as jest.Mock).mockReturnValue({
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
    it('should call discovery() only once and reuse the configuration', async () => {
      (fetchUserInfo as jest.Mock).mockResolvedValue(createJWTPayload({ sub: 'u1' }));

      await service.getUserInfo('token1');
      await service.getUserInfo('token2');

      expect(discovery).toHaveBeenCalledTimes(1);
    });

    it('should throw ServiceUnavailableException when discovery fails', async () => {
      (discovery as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      await expect(service.getUserInfo('token')).rejects.toMatchObject({
        message: 'OIDC provider unreachable: Connection refused',
      });
    });

    it('should retry discovery on next request after a failure', async () => {
      (discovery as jest.Mock)
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(mockConfiguration);
      (fetchUserInfo as jest.Mock).mockResolvedValue(createJWTPayload({ sub: 'u1' }));

      // First call fails
      await expect(service.getUserInfo('token')).rejects.toThrow();
      // Second call succeeds (discovery retried)
      const result = await service.getUserInfo('token');
      expect(result.cerbereId).toBe('u1');
      expect(discovery).toHaveBeenCalledTimes(2);
    });
  });

  describe('mapClaimsToUser (tested indirectly)', () => {
    it('should map all JWT claims to AuthenticatedUser structure', async () => {
      const fullClaims = createJWTPayload({
        sub: 'user-full',
        preferred_username: 'full.user',
        usual_name: 'User',
        given_name: 'Full',
        email: 'full@example.com',
        cerbere_matricule: 'FULL001',
        organizational_unit: 'Engineering',
        email_metier: 'full.work@example.com',
        cerbere_description: 'Lead Engineer',
        cerbere_mobile: '+33600000000',
        phone_number: '+33100000000',
        cerbere_profils: ['PROFILE1;SCOPE1;', 'PROFILE2;SCOPE2;'],
        cerbere_roles: ['ROLE_1', 'ROLE_2', 'ROLE_3'],
      });

      (fetchUserInfo as jest.Mock).mockResolvedValue(fullClaims);

      const result = await service.getUserInfo('token');

      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: 'user-full',
          login: 'full.user',
          nom: 'User',
          prenom: 'Full',
          mel: 'full@example.com',
          matricule: 'FULL001',
          unite: 'Engineering',
          emailMetier: 'full.work@example.com',
          description: 'Lead Engineer',
          mobile: '+33600000000',
          telephone: '+33100000000',
          profils: ['PROFILE1;SCOPE1;', 'PROFILE2;SCOPE2;'],
          roles: ['ROLE_1', 'ROLE_2', 'ROLE_3'],
        }),
      );
    });

    it('should use sub as fallback for matricule when cerbere_matricule is missing', async () => {
      const claimsWithoutMatricule = createJWTPayload({
        sub: 'user-sub-fallback',
        preferred_username: 'test.user',
        usual_name: 'User',
        given_name: 'Test',
        email: 'test@example.com',
      });

      (fetchUserInfo as jest.Mock).mockResolvedValue(claimsWithoutMatricule);

      const result = await service.getUserInfo('token');

      expect(result.matricule).toBe('user-sub-fallback');
    });

    it('should handle empty string values', async () => {
      const claimsWithEmptyStrings = createJWTPayload({
        sub: '',
        preferred_username: '',
        usual_name: '',
        given_name: '',
        email: '',
        cerbere_matricule: '',
      });

      (fetchUserInfo as jest.Mock).mockResolvedValue(claimsWithEmptyStrings);

      const result = await service.getUserInfo('token');

      expect(result).toEqual(
        createAuthenticatedUser({
          cerbereId: '',
          login: '',
          nom: '',
          prenom: '',
          mel: '',
          matricule: '',
        }),
      );
    });
  });

  describe('JWKS initialization', () => {
    it('should throw error when jwks_uri is missing from metadata', async () => {
      (mockConfiguration.serverMetadata as jest.Mock).mockReturnValue({
        ...mockServerMetadata,
        jwks_uri: undefined,
      });

      // JWT verification fails due to missing JWKS; fetchUserInfo also fails to simulate total failure
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('JWKS URI not available in OIDC metadata'));
      (fetchUserInfo as jest.Mock).mockRejectedValue(new Error('JWKS URI not available in OIDC metadata'));

      await expect(service.validateToken('token')).rejects.toThrow(
        'Token validation failed: JWKS URI not available in OIDC metadata',
      );
    });
  });
});
