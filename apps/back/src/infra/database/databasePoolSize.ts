import { ConfigService } from '@nestjs/config';

const DATABASE_POOL_ENV_BY_PROCESS = {
  api: 'DATABASE_POOL_API',
  worker: 'DATABASE_POOL_WORKER',
} as const;

const DEFAULT_DATABASE_POOL_SIZE = 50;

export const resolveDatabasePoolSize = (configService: ConfigService): number => {
  const processType = configService.get<string | null>('PROCESS_TYPE');
  if (processType === undefined || processType === null) {
    return DEFAULT_DATABASE_POOL_SIZE;
  }

  if (processType !== 'api' && processType !== 'worker') {
    throw new Error(`Unknown PROCESS_TYPE: ${processType}`);
  }

  const poolEnvironmentVariable = DATABASE_POOL_ENV_BY_PROCESS[processType];
  const configuredPoolSize = configService.get<string | null>(poolEnvironmentVariable);
  if (configuredPoolSize === undefined || configuredPoolSize === null) {
    return DEFAULT_DATABASE_POOL_SIZE;
  }

  const poolSize = Number(configuredPoolSize);
  if (!Number.isInteger(poolSize) || poolSize <= 0) {
    throw new Error(`${poolEnvironmentVariable} must be a positive integer`);
  }

  return poolSize;
};
