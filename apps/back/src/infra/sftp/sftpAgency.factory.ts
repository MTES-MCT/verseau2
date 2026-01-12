import { ConfigService } from '@nestjs/config';
import { SftpAgency } from './sftpAgency';
import { SftpAgencyService } from './sftpAgency.service';
import { SftpAgencyMock } from './sftpAgency.mock';

import { LoggerService } from '@shared/logger/logger.service';

export const createSftpAgency = (configService: ConfigService, logger: LoggerService): SftpAgency => {
  const sftpAgencyProvider = configService.get<string>('SFTP_AGENCY_PROVIDER');

  if (sftpAgencyProvider === 'mock') {
    return new SftpAgencyMock(logger);
  }

  return new SftpAgencyService(configService, logger);
};

export const createSftpAgencyProviders = () => [
  {
    provide: SftpAgency,
    inject: [ConfigService, LoggerService],
    useFactory: createSftpAgency,
  },
];
