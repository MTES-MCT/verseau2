import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SftpModule } from './sftp.module';
import { Sftp } from './sftp';
import { SftpService } from './sftp.service';
import { SftpProviderMock } from './sftp.provider.mock';

describe('SftpModule', () => {
  let module: TestingModule;
  let sftp: Sftp;

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('should provide SftpProviderMock when SFTP_PROVIDER is mock', async () => {
    mockConfigService.get.mockReturnValue('mock');

    module = await Test.createTestingModule({
      imports: [SftpModule.forRootAsync()],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    sftp = module.get<Sftp>(Sftp);
    expect(sftp).toBeInstanceOf(SftpProviderMock);
  });

  it('should provide SftpService when SFTP_PROVIDER is not mock', async () => {
    mockConfigService.get.mockReturnValue('real');
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'SFTP_HOST') return 'localhost';
      if (key === 'SFTP_PORT') return 22;
      if (key === 'SFTP_USERNAME') return 'user';
      if (key === 'SFTP_PRIVATE_KEY') return 'key';
      return null;
    });

    module = await Test.createTestingModule({
      imports: [SftpModule.forRootAsync()],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    sftp = module.get<Sftp>(Sftp);
    expect(sftp).toBeInstanceOf(SftpService);
  });
});
