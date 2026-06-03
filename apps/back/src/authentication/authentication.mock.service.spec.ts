import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticationMockService } from './authentication.mock.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { DataSource } from 'typeorm';
import { UserEntity } from '@user/user.entity';

describe('AuthenticationMockService', () => {
  let service: AuthenticationMockService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockDroitsUserService: jest.Mocked<DroitsUserService>;
  let mockDataSource: Pick<DataSource, 'getRepository'>;
  let mockFindOne: jest.Mock;

  const JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long!!';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OIDC_MOCK_EMAIL') {
          return 'real.user@example.com';
        }
        return null;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') {
          return JWT_SECRET;
        }
        throw new Error(`Missing config: ${key}`);
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

  it('returns the configured real user from OIDC_MOCK_EMAIL', async () => {
    const result = await service.handleCallback('mock-code', 'mock-nonce');

    expect(mockDataSource.getRepository).toHaveBeenCalledWith(UserEntity);
    expect(mockFindOne).toHaveBeenCalledWith({ where: { email: 'real.user@example.com' } });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockDroitsUserService.resolveItvCdn).toHaveBeenCalledWith('real-sub');
    expect(result.user).toEqual({
      cerbereId: 'real-sub',
      mel: 'real.user@example.com',
      itvCdn: 917072,
      isExpertNational: false,
      nom: 'Real',
      prenom: 'User',
    });
    expect(result.accessToken).toBeTruthy();
    await expect(service.validateToken(result.accessToken)).resolves.toMatchObject({
      cerbereId: 'real-sub',
      mel: 'real.user@example.com',
      itvCdn: 917072,
      isExpertNational: false,
    });
  });

  it('extracts subject from a token issued by the mock service', async () => {
    const { accessToken } = await service.handleCallback('mock-code', 'mock-nonce');
    await expect(service.extractSubjectFromExpiredToken(accessToken)).resolves.toBe('real-sub');
  });

  it('refreshes tokens for the same mock user', async () => {
    const initial = await service.handleCallback('mock-code', 'mock-nonce');

    const refreshed = await service.refreshTokens(initial.refreshToken ?? '', 'real-sub');

    expect(refreshed.accessToken).toBeTruthy();
    await expect(service.validateToken(refreshed.accessToken)).resolves.toMatchObject({
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

  it('fails when validateToken receives an empty token', async () => {
    await expect(service.validateToken('')).rejects.toThrow(UnauthorizedException);
  });

  it('fails when extractSubjectFromExpiredToken receives an empty token', async () => {
    await expect(service.extractSubjectFromExpiredToken('')).rejects.toThrow(UnauthorizedException);
  });
});
