import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SftpModule } from './sftp.module';
import { Sftp } from './sftp';
import { SftpService } from './sftp.service';
import { SftpProviderMock } from './sftp.provider.mock';
import { SharedModule } from '@shared/shared.module';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';

describe('SftpModule', () => {
  let module: TestingModule;
  let sftp: Sftp;
  const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----\naaa\n-----END OPENSSH PRIVATE KEY-----\n`;
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
    expect(sftp).toBeInstanceOf(SftpService);
    expect((sftp as any).config.privateKey).toBe(privateKey);
  });
});
