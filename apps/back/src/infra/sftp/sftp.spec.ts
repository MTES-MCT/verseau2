import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'node:crypto';
import { SftpModule } from './sftp.module';
import { Sftp } from './sftp';
import { SftpService } from './sftp.service';
import { SftpProviderMock } from './sftp.provider.mock';
import { SharedModule } from '@shared/shared.module';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { decodeSftpPrivateKey } from './sftp.factory';

const createTestPrivateKey = (): string => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
};

describe('SftpModule', () => {
  let module: TestingModule;
  let sftp: Sftp;
  const privateKey = createTestPrivateKey();
  const encodedPrivateKey = Buffer.from(privateKey, 'utf8').toString('base64');

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide SftpProviderMock when SFTP_PROVIDER is mock', async () => {
    mockConfigService.get.mockReturnValue('mock');

    module = await Test.createTestingModule({
      imports: [SftpModule.forRootAsync(), SharedModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    sftp = module.get<Sftp>(Sftp);
    expect(sftp).toBeInstanceOf(SftpProviderMock);
  });

  it('should provide SftpService when SFTP_PROVIDER is not mock', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'SFTP_PROVIDER') {
        return 'real';
      }
      if (key === 'SFTP_AGENCY_PROVIDER') {
        return 'mock';
      }
      return null;
    });
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'SFTP_HOST') {
        return 'localhost';
      }
      if (key === 'SFTP_PORT') {
        return 22;
      }
      if (key === 'SFTP_USERNAME') {
        return 'user';
      }
      if (key === 'SFTP_PRIVATE_KEY') {
        return encodedPrivateKey;
      }
      return null;
    });

    module = await Test.createTestingModule({
      imports: [SftpModule.forRootAsync(), SharedModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    sftp = module.get<Sftp>(Sftp);
    const sftpConfig = (sftp as unknown as { config: { privateKey: string } }).config;

    expect(sftp).toBeInstanceOf(SftpService);
    expect(sftpConfig.privateKey).toBe(privateKey);
  });

  it('should reject invalid SFTP_PRIVATE_KEY values with ssh2 parser', () => {
    const invalidPrivateKey = Buffer.from('not a private key', 'utf8').toString('base64');

    expect(() => decodeSftpPrivateKey(invalidPrivateKey)).toThrow(/Invalid SFTP_PRIVATE_KEY: Unsupported key format/);
  });
});
