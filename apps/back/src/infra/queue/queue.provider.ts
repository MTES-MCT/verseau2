import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import { PGBOSS, QueueName, resolveQueueName } from './queue';
import { LoggerService } from '@shared/logger/logger.service';
import { UpdateQueueOptions } from 'pg-boss/dist/types';

const TWO_HOURS_IN_SECONDS = 2 * 60 * 60;

const queueOptions: Partial<Record<QueueName, UpdateQueueOptions>> = {
  [QueueName.controle_sandre]: {
    expireInSeconds: TWO_HOURS_IN_SECONDS,
    retryLimit: 0,
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
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create queue "${queueName}": ${errorMsg}`);
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

    if (prefix) {
      logger.log(`Queue prefix configured: "${prefix}"`);
    }

    const boss = new PgBoss({ connectionString, max: 4 });

    // Error handler for pg-boss background operations
    boss.on('error', (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`PgBoss error: ${errorMsg}`);
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
