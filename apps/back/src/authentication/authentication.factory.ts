import { ConfigService } from '@nestjs/config';
import { Authentication } from './authentication';
import { AuthenticationService } from './authentication.service';
import { AuthenticationMockService } from './authentication.mock.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { DataSource } from 'typeorm';

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
        logger.warn('MOCK AUTHENTICATION SERVICE IN USE');
        return createAuthenticationMockService(configService, droitsUserService, dataSource);
      }
      return createAuthenticationService(configService, logger, droitsUserService);
    },
  },
];
