import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'node:crypto';
import { AgentVerseauClient } from './agentVerseauClient';
import { AgentVerseauClientModule } from './agentVerseauClient.module';
import { AgentVerseauClientMock } from './agentVerseauClient.mock';
import { SftpService } from '../sftp/sftp.service';
import { SharedModule } from '@shared/shared.module';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';

const createTestPrivateKey = (): string => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
};

describe('AgentVerseauClientModule', () => {
  let module: TestingModule;
  let agentVerseauClient: AgentVerseauClient;
  const privateKey = createTestPrivateKey();
  const encodedPrivateKey = Buffer.from(privateKey, 'utf8').toString('base64');

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide AgentVerseauClientMock when SFTP_PROVIDER is mock', async () => {
    mockConfigService.get.mockReturnValue('mock');

    module = await Test.createTestingModule({
      imports: [AgentVerseauClientModule.forRootAsync(), SharedModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    agentVerseauClient = module.get<AgentVerseauClient>(AgentVerseauClient);
    expect(agentVerseauClient).toBeInstanceOf(AgentVerseauClientMock);
  });

  it('should provide SftpService with Agent Verseau uploads remote path', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'SFTP_PROVIDER') {
        return 'real';
      }
      if (key === 'SFTP_REMOTE_PATH') {
        return 'agent-root';
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
      imports: [AgentVerseauClientModule.forRootAsync(), SharedModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    agentVerseauClient = module.get<AgentVerseauClient>(AgentVerseauClient);
    const sftpConfig = (agentVerseauClient as unknown as { config: { privateKey: string; remotePath: string } }).config;

    expect(agentVerseauClient).toBeInstanceOf(SftpService);
    expect(sftpConfig.privateKey).toBe(privateKey);
    expect(sftpConfig.remotePath).toBe('agent-root/uploads');
  });
});
