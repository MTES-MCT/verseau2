import { ConfigService } from '@nestjs/config';
import { SftpAgency } from './sftpAgency';
import { SftpAgencyService } from './sftpAgency.service';
import { SftpAgencyMock } from './sftpAgency.mock';

export const createSftpAgency = (configService: ConfigService): SftpAgency => {
  const sftpAgencyProvider = configService.get<string>('SFTP_AGENCY_PROVIDER');

  if (sftpAgencyProvider === 'mock') {
    return new SftpAgencyMock();
  }

  return new SftpAgencyService(configService);
};

export const createSftpAgencyProviders = () => [
  {
    provide: SftpAgency,
    inject: [ConfigService],
    useFactory: createSftpAgency,
  },
];
