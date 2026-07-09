import { ConfigService } from '@nestjs/config';
import { AgenceEauClient } from './agenceEauClient';
import { AgenceEauClientService } from './agenceEauClient.service';
import { AgenceEauClientMock } from './agenceEauClient.mock';

import { LoggerService } from '@shared/logger/logger.service';

export const createAgenceEauClient = (configService: ConfigService, logger: LoggerService): AgenceEauClient => {
  const agenceEauClientProvider = configService.get<string>('SFTP_AGENCY_PROVIDER');

  if (agenceEauClientProvider === 'mock') {
    return new AgenceEauClientMock(logger);
  }

  return new AgenceEauClientService(configService, logger);
};

export const createAgenceEauClientProviders = () => [
  {
    provide: AgenceEauClient,
    inject: [ConfigService, LoggerService],
    useFactory: createAgenceEauClient,
  },
];
