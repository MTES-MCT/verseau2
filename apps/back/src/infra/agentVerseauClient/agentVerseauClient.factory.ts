import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import Client from 'ssh2-sftp-client';
import { SFTP_CLIENT, SftpService } from '../sftp/sftp.service';
import { decodeSftpPrivateKey } from '../sftp/sftp-private-key';
import { AgentVerseauClient } from './agentVerseauClient';
import { AgentVerseauClientMock } from './agentVerseauClient.mock';
import { LoggerService } from '@shared/logger/logger.service';

export const createAgentVerseauSftpClient = (configService: ConfigService, sftpClient: Client): AgentVerseauClient => {
  const logger = new LoggerService('agentVerseauClient.factory');

  const sftpProvider = configService.get<string>('SFTP_PROVIDER');

  if (sftpProvider === 'mock') {
    logger.warn('Using Agent Verseau client mock provider');
    return new AgentVerseauClientMock(logger);
  }

  const host = configService.getOrThrow<string>('SFTP_HOST');
  const port = configService.getOrThrow<number>('SFTP_PORT');
  const username = configService.getOrThrow<string>('SFTP_USERNAME');
  const privateKey = decodeSftpPrivateKey(configService.getOrThrow<string>('SFTP_PRIVATE_KEY'));
  const remotePath = path.posix.join(configService.get<string>('SFTP_REMOTE_PATH') ?? '', 'uploads');

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

export const createAgentVerseauClientProviders = () => [
  {
    provide: AgentVerseauClient,
    inject: [ConfigService, SFTP_CLIENT],
    useFactory: createAgentVerseauSftpClient,
  },
];
