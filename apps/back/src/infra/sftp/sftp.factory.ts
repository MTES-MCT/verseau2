import { ConfigService } from '@nestjs/config';
import Client from 'ssh2-sftp-client';
import { SftpService, SFTP_CLIENT } from './sftp.service';
import { Sftp } from './sftp';
import { SftpProviderMock } from './sftp.provider.mock';

export const createSftpService = (configService: ConfigService, sftpClient: Client): Sftp => {
  const sftpProvider = configService.get<string>('SFTP_PROVIDER');

  if (sftpProvider === 'mock') {
    return new SftpProviderMock();
  }

  const host = configService.getOrThrow<string>('SFTP_HOST');
  const port = configService.getOrThrow<number>('SFTP_PORT');
  const username = configService.getOrThrow<string>('SFTP_USERNAME');
  const privateKey = configService.getOrThrow<string>('SFTP_PRIVATE_KEY');

  return new SftpService(sftpClient, {
    host,
    port,
    username,
    privateKey,
  });
};

export const createSftpProviders = () => [
  {
    provide: SFTP_CLIENT,
    useFactory: () => {
      return new Client();
    },
  },
  {
    provide: Sftp,
    inject: [ConfigService, SFTP_CLIENT],
    useFactory: createSftpService,
  },
];
