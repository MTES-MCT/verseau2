import { ConfigService } from '@nestjs/config';
import { discovery, Configuration } from 'openid-client';
import { Authentication } from './authentication';
import { AuthenticationService } from './authentication.service';
import { AuthenticationMockService } from './authentication.mock.service';
import { LoggerService } from '@shared/logger/logger.service';

export const createAuthenticationService = (configuration: Configuration): Authentication => {
  return new AuthenticationService(configuration);
};

export const createAuthenticationMockService = (): Authentication => {
  return new AuthenticationMockService();
};
const logger = new LoggerService('AuthenticationFactory');
export const createAuthenticationProviders = () => [
  {
    provide: 'OIDC_CONFIGURATION',
    useFactory: async (configService: ConfigService): Promise<Configuration | null> => {
      const useMock = configService.get<string>('OIDC_MOCK') === 'true';
      if (useMock) {
        return null;
      }
      const issuerUrl = configService.getOrThrow<string>('OIDC_ISSUER_URL');
      const clientId = configService.getOrThrow<string>('OIDC_CLIENT_ID');
      return await discovery(new URL(issuerUrl), clientId);
    },
    inject: [ConfigService],
  },
  {
    provide: Authentication,
    inject: ['OIDC_CONFIGURATION', ConfigService],
    useFactory: (configuration: Configuration, configService: ConfigService): Authentication => {
      const useMock = configService.get<string>('OIDC_MOCK') === 'true';
      if (useMock) {
        logger.warn('MOCK AUTHENTICATION SERVICE IN USE');
        return createAuthenticationMockService();
      }
      return createAuthenticationService(configuration);
    },
  },
];
