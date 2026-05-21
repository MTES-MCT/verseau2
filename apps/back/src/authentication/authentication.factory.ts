import { ConfigService } from '@nestjs/config';
import { Authentication } from './authentication';
import { AuthenticationService } from './authentication.service';
import { AuthenticationMockService } from './authentication.mock.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { DataSource } from 'typeorm';

const assertMockAuthenticationConfig = (configService: ConfigService) => {
  const mockEmail = configService.get<string>('OIDC_MOCK_EMAIL')?.trim();
  if (!mockEmail) {
    throw new Error('OIDC_MOCK_EMAIL is required when OIDC_MOCK=true');
  }
  if (configService.get<string>('NODE_ENV') === 'production') {
    throw new Error('Mock authentication cannot be used in production environment');
  }
};

export const createAuthenticationService = (
  configService: ConfigService,
  logger: LoggerService,
  droitsUserService: DroitsUserService,
): Authentication => {
  return new AuthenticationService(configService, logger, droitsUserService);
};

export const createAuthenticationMockService = (
  configService: ConfigService,
  droitsUserService: DroitsUserService,
  dataSource: DataSource,
): Authentication => {
  return new AuthenticationMockService(configService, droitsUserService, dataSource);
};

export const createAuthenticationProviders = () => [
  {
    provide: Authentication,
    inject: [ConfigService, LoggerService, DroitsUserService, DataSource],
    useFactory: (
      configService: ConfigService,
      logger: LoggerService,
      droitsUserService: DroitsUserService,
      dataSource: DataSource,
    ): Authentication => {
      const useMock = configService.get<string>('OIDC_MOCK') === 'true';
      if (useMock) {
        assertMockAuthenticationConfig(configService);
        logger.warn('MOCK AUTHENTICATION SERVICE IN USE');
        return createAuthenticationMockService(configService, droitsUserService, dataSource);
      }
      return createAuthenticationService(configService, logger, droitsUserService);
    },
  },
];
