import { ConfigService } from '@nestjs/config';
import { PgBoss, type QueueOptions } from 'pg-boss';
import { PGBOSS, QueueName, resolveQueueName } from './queue';
import { LoggerService } from '@shared/logger/logger.service';
import { getQueueErrorDetails } from './queueErrorDetails';

const PGBOSS_POOL_MAX_ENV = 'PGBOSS_POOL_MAX';
const DEFAULT_PGBOSS_POOL_MAX = 10;
const PGBOSS_CONNECTION_TIMEOUT_ENV = 'PGBOSS_CONNECTION_TIMEOUT_MS';
const DEFAULT_PGBOSS_CONNECTION_TIMEOUT_MILLIS = 10_000;

export function resolvePgBossPoolMax(configService: ConfigService): number {
  const configuredMax = configService.get<string | null>(PGBOSS_POOL_MAX_ENV);
  if (configuredMax === undefined || configuredMax === null) {
    return DEFAULT_PGBOSS_POOL_MAX;
  }

  const max = Number(configuredMax);
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error(`${PGBOSS_POOL_MAX_ENV} must be a positive integer`);
  }

  return max;
}

export function resolvePgBossConnectionTimeoutMillis(configService: ConfigService): number {
  const configuredTimeout = configService.get<string | null>(PGBOSS_CONNECTION_TIMEOUT_ENV);
  if (configuredTimeout === undefined || configuredTimeout === null) {
    return DEFAULT_PGBOSS_CONNECTION_TIMEOUT_MILLIS;
  }

  const timeout = Number(configuredTimeout);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new Error(`${PGBOSS_CONNECTION_TIMEOUT_ENV} must be a positive integer`);
  }

  return timeout;
}

const queueOptions: Partial<Record<QueueName, QueueOptions>> = {
  [QueueName.controle_sandre_upload]: {
    expireInSeconds: 120, // 2 minutes
    retryLimit: 2,
  },
  [QueueName.controle_sandre_poll]: {
    expireInSeconds: 60, // 1 minute
    retryLimit: 2,
  },
};

/**
 * Create and initialize all required queues
 */
async function initializeQueues(boss: PgBoss, logger: LoggerService, prefix?: string): Promise<void> {
  const queueNames = Object.values(QueueName);
  const createQueuePromises = queueNames.map(async (queueName) => {
    try {
      const resolvedName = resolveQueueName(queueName, prefix);
      const options = queueOptions[queueName];
      await boss.createQueue(resolvedName, options);

      if (options) {
        await boss.updateQueue(resolvedName, options);
      }

      logger.log(`Queue "${resolvedName}" initialized`);
    } catch (error) {
      logger.error(`Failed to create queue "${queueName}"`, getQueueErrorDetails(error));
      throw error; // Fail-fast: prevent bootstrap with incomplete queue setup
    }
  });

  await Promise.all(createQueuePromises);
}

export const queueProvider = {
  provide: PGBOSS,
  inject: [ConfigService, LoggerService],
  useFactory: async (configService: ConfigService, logger: LoggerService) => {
    logger.setContext('QueueModule');
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    const prefix = configService.get<string>('QUEUE_PREFIX');
    const poolMax = resolvePgBossPoolMax(configService);
    const connectionTimeoutMillis = resolvePgBossConnectionTimeoutMillis(configService);

    if (prefix) {
      logger.log(`Queue prefix configured: "${prefix}"`);
    }

    logger.log(`PgBoss pool configured: max ${poolMax}, connection timeout ${connectionTimeoutMillis} ms`);

    const boss = new PgBoss({ connectionString, max: poolMax, connectionTimeoutMillis });

    // Error handler for pg-boss background operations
    boss.on('error', (error) => {
      logger.error('PgBoss error', getQueueErrorDetails(error));
    });

    await boss.start();
    logger.log('PgBoss started');

    // Initialize all queues and fail-fast if any fail
    await initializeQueues(boss, logger, prefix);

    // Log effective queue configuration from database
    for (const queueName of Object.values(QueueName)) {
      const resolvedName = resolveQueueName(queueName, prefix);
      const queue = await boss.getQueue(resolvedName);
      if (queue) {
        logger.log(`Queue "${resolvedName}" effective config`, {
          expireInSeconds: queue.expireInSeconds,
          retryLimit: queue.retryLimit,
          retryDelay: queue.retryDelay,
          retryBackoff: queue.retryBackoff,
        });
      }
    }

    return boss;
  },
};
