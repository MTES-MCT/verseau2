import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import { PGBOSS, QueueName } from './queue';
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
async function initializeQueues(boss: PgBoss, logger: LoggerService): Promise<void> {
  const queueNames = Object.values(QueueName);
  const createQueuePromises = queueNames.map(async (queueName) => {
    try {
      const options = queueOptions[queueName];
      await boss.createQueue(queueName, options);

      if (options) {
        await boss.updateQueue(queueName, options);
      }

      logger.log(`Queue "${queueName}" initialized`);
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

    const boss = new PgBoss({ connectionString, max: 4 });

    // Error handler for pg-boss background operations
    boss.on('error', (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`PgBoss error: ${errorMsg}`);
    });

    await boss.start();
    logger.log('PgBoss started');

    // Initialize all queues and fail-fast if any fail
    await initializeQueues(boss, logger);

    // Log effective queue configuration from database
    for (const queueName of Object.values(QueueName)) {
      const queue = await boss.getQueue(queueName);
      if (queue) {
        logger.log(`Queue "${queueName}" effective config`, {
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
