import { ConfigService } from '@nestjs/config';
import { Authentication } from './authentication';
import { AuthenticationService } from './authentication.service';
import { AuthenticationMockService } from './authentication.mock.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { DataSource } from 'typeorm';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal']);

const isTestRuntime = () => process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

const isLoopbackUrl = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return LOOPBACK_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost');
  } catch {
    return false;
  }
};

const assertMockAuthenticationConfig = (configService: ConfigService) => {
  const mockEmail = configService.get<string>('OIDC_MOCK_EMAIL')?.trim();
  if (!mockEmail) {
    throw new Error('OIDC_MOCK_EMAIL is required when OIDC_MOCK=true');
  }

  if (isTestRuntime()) {
    return;
  }

  const redirectUri = configService.get<string>('OIDC_REDIRECT_URI')?.trim();
  if (!redirectUri || !isLoopbackUrl(redirectUri)) {
    throw new Error('OIDC_MOCK=true is only allowed with a loopback OIDC_REDIRECT_URI or in automated tests.');
  }

  const corsOrigin = configService.get<string>('CORS_ORIGIN')?.trim();
  if (corsOrigin && !isLoopbackUrl(corsOrigin)) {
    throw new Error('OIDC_MOCK=true requires CORS_ORIGIN to stay on a loopback origin when it is set.');
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
