import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticationMockService } from './authentication.mock.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { jwtVerify, SignJWT } from 'jose';
import { DataSource } from 'typeorm';
import { UserEntity } from '@user/user.entity';

const mockSign = jest.fn().mockResolvedValue('signed-mock-jwt');
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

describe('AuthenticationMockService', () => {
  let service: AuthenticationMockService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockDroitsUserService: jest.Mocked<DroitsUserService>;
  let mockDataSource: Pick<DataSource, 'getRepository'>;
  let mockFindOne: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OIDC_MOCK_EMAIL') return 'real.user@example.com';
        return null;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'mock-jwt-secret';
        throw new Error(`Config key ${key} not found`);
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockFindOne = jest.fn().mockResolvedValue({
      id: 'user-id',
      sub: 'real-sub',
      email: 'real.user@example.com',
      nom: 'Real',
      prenom: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserEntity);

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne: mockFindOne }),
    };

    mockDroitsUserService = {
      resolveItvCdn: jest.fn().mockResolvedValue(917072),
      isExpertNationalVerseau: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<DroitsUserService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationMockService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DroitsUserService, useValue: mockDroitsUserService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(AuthenticationMockService);
  });

  it('forges and validates a signed internal JWT from OIDC_MOCK_EMAIL', async () => {
    const result = await service.handleCallback('mock-code', 'mock-nonce');

    expect(mockDataSource.getRepository).toHaveBeenCalledWith(UserEntity);
    expect(mockFindOne).toHaveBeenCalledWith({ where: { email: 'real.user@example.com' } });
    expect(mockDroitsUserService.resolveItvCdn).toHaveBeenCalledWith('real-sub');
    expect(SignJWT).toHaveBeenCalledWith({
      sub: 'real-sub',
      email: 'real.user@example.com',
      itvCdn: 917072,
      isExpertNational: false,
    });
    expect(result.user).toEqual({
      cerbereId: 'real-sub',
      mel: 'real.user@example.com',
      itvCdn: 917072,
      isExpertNational: false,
      nom: 'Real',
      prenom: 'User',
    });
    expect(result.accessToken).toBe('signed-mock-jwt');

    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: 'real-sub',
        email: 'real.user@example.com',
        itvCdn: 917072,
        isExpertNational: false,
      },
    });
    await expect(service.validateToken(result.accessToken)).resolves.toEqual({
      cerbereId: 'real-sub',
      mel: 'real.user@example.com',
      itvCdn: 917072,
      isExpertNational: false,
    });
  });

  it('extracts subject from a signed token', async () => {
    const result = await service.handleCallback('mock-code', 'mock-nonce');

    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: 'real-sub',
      },
    });

    await expect(service.extractSubjectFromExpiredToken(result.accessToken)).resolves.toBe('real-sub');
  });

  it('refreshes tokens for the same mock user', async () => {
    const initial = await service.handleCallback('mock-code', 'mock-nonce');

    const refreshed = await service.refreshTokens(initial.refreshToken ?? '', 'real-sub');

    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: 'real-sub',
        email: 'real.user@example.com',
        itvCdn: 917072,
        isExpertNational: false,
      },
    });
    await expect(service.validateToken(refreshed.accessToken)).resolves.toEqual({
      cerbereId: 'real-sub',
      mel: 'real.user@example.com',
      itvCdn: 917072,
      isExpertNational: false,
    });
  });

  it('fails when OIDC_MOCK_EMAIL is missing', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(service.handleCallback('mock-code', 'mock-nonce')).rejects.toThrow(UnauthorizedException);
  });

  it('fails when the configured user does not exist', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    await expect(service.handleCallback('mock-code', 'mock-nonce')).rejects.toThrow(UnauthorizedException);
  });

  it('fails when the expected subject does not match on refresh', async () => {
    await expect(service.refreshTokens('refresh-token', 'other-sub')).rejects.toThrow(UnauthorizedException);
  });
});
