import { ConfigService } from '@nestjs/config';
import { Authentication } from './authentication';
import { AuthenticationService } from './authentication.service';
import { AuthenticationMockService } from './authentication.mock.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DroitsUserService } from '@user/droitsUser.service';

export const createAuthenticationService = (
  configService: ConfigService,
  logger: LoggerService,
  droitsUserService: DroitsUserService,
): Authentication => {
  return new AuthenticationService(configService, logger, droitsUserService);
};

export const createAuthenticationMockService = (configService: ConfigService): Authentication => {
  return new AuthenticationMockService(configService);
};

export const createAuthenticationProviders = () => [
  {
    provide: Authentication,
    inject: [ConfigService, LoggerService, DroitsUserService],
    useFactory: (
      configService: ConfigService,
      logger: LoggerService,
      droitsUserService: DroitsUserService,
    ): Authentication => {
      const useMock = configService.get<string>('OIDC_MOCK') === 'true';
      if (useMock) {
        logger.warn('MOCK AUTHENTICATION SERVICE IN USE');
        return createAuthenticationMockService(configService);
      }
      return createAuthenticationService(configService, logger, droitsUserService);
    },
  },
];
