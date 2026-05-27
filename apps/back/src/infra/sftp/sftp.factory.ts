import { ConfigService } from '@nestjs/config';
import Client from 'ssh2-sftp-client';
import { SftpService, SFTP_CLIENT } from './sftp.service';
import { Sftp } from './sftp';
import { SftpProviderMock } from './sftp.provider.mock';
import { LoggerService } from '@shared/logger/logger.service';

export const createSftpAgentVerseauService = (configService: ConfigService, sftpClient: Client): Sftp => {
  const logger = new LoggerService('sftp.factory');

  const sftpProvider = configService.get<string>('SFTP_PROVIDER');

  if (sftpProvider === 'mock') {
    logger.warn('Using SFTP mock provider');
    return new SftpProviderMock(logger);
  }

  const host = configService.getOrThrow<string>('SFTP_HOST');
  const port = configService.getOrThrow<number>('SFTP_PORT');
  const username = configService.getOrThrow<string>('SFTP_USERNAME');
  const privateKey = configService.getOrThrow<string>('SFTP_PRIVATE_KEY');
  const remotePath = configService.get<string>('SFTP_REMOTE_PATH');

  logger.log(`Using SFTP service for Agent Verseau with host: ${host}, port: ${port}, username: ${username}`);
  return new SftpService(
    sftpClient,
    {
      host,
      port,
      username,
      privateKey,
      remotePath,
    },
    logger,
  );
};

export const createSftpAgentVerseauProviders = () => [
  {
    provide: SFTP_CLIENT,
    useFactory: () => {
      return new Client();
    },
  },
  {
    provide: Sftp,
    inject: [ConfigService, SFTP_CLIENT],
    useFactory: createSftpAgentVerseauService,
  },
];
