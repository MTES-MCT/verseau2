import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { PgBoss } from 'pg-boss';
import { DataSource } from 'typeorm';
import { PGBOSS, QueueGateway, QueueName, resolveQueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { QueueModule } from '@queue/queue.module';
import { SharedModule } from '@shared/shared.module';
import { startPostgresContainer } from './testcontainer.config';

// Register through the same hook and gateway as WorkerService, using the
// production queue factory rather than manually starting pg-boss in the test.
@Injectable()
class LifecycleConsumer implements OnModuleInit {
  workerId?: string;

  constructor(@Inject(QueueGateway) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    this.workerId = await this.queue.work(QueueName.email, { batchSize: 1 }, () => Promise.resolve());
  }
}

describe('Production queue lifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes queues before consumers and stops pg-boss before closing TypeORM', async () => {
    const container = await startPostgresContainer({ new: true });
    const prefix = 'antivirus_lifecycle';
    const app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [() => ({ DATABASE_URL: container.getConnectionUri(), DDL_SYNC: 'false', QUEUE_PREFIX: prefix })],
        }),
        ClsModule.forRoot({ global: true }),
        SharedModule,
        QueueModule,
      ],
      providers: [LifecycleConsumer],
    }).compile();

    const boss = app.get<PgBoss>(PGBOSS);
    const dataSource = app.get(DataSource);
    const shutdownEvents: string[] = [];
    const databaseOpenDuringStop: boolean[] = [];
    const stop = boss.stop.bind(boss) as typeof boss.stop;
    const destroy = dataSource.destroy.bind(dataSource) as typeof dataSource.destroy;

    const stopSpy = jest.spyOn(boss, 'stop').mockImplementation(async (...args) => {
      databaseOpenDuringStop.push(dataSource.isInitialized);
      await stop(...args);
      databaseOpenDuringStop.push(dataSource.isInitialized);
      shutdownEvents.push('queue-stopped');
    });
    jest.spyOn(dataSource, 'destroy').mockImplementation(async () => {
      shutdownEvents.push('database-closing');
      await destroy();
    });

    try {
      const queues = await Promise.all(
        Object.values(QueueName).map((name) => boss.getQueue(resolveQueueName(name, prefix))),
      );
      expect(queues.every((queue) => Boolean(queue))).toBe(true);
      expect(await boss.getQueue(resolveQueueName(QueueName.process_file, prefix))).toMatchObject({
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        retryDelayMax: 120,
        expireInSeconds: 300,
        deadLetter: resolveQueueName(QueueName.process_file_failed, prefix),
      });
      expect(await boss.getQueue(resolveQueueName(QueueName.antivirus_scan, prefix))).toMatchObject({
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        retryDelayMax: 120,
        expireInSeconds: Math.ceil(Number(process.env.ANTIVIRUS_TIMEOUT_MS ?? 150_000) / 1000) + 150,
        deadLetter: resolveQueueName(QueueName.antivirus_scan_failed, prefix),
      });

      await app.init();

      const consumer = app.get(LifecycleConsumer);
      expect(consumer.workerId).toEqual(expect.any(String));
      expect(dataSource.isInitialized).toBe(true);
    } finally {
      // Exercise Nest's shutdown hooks, without stopping pg-boss manually.
      await app.close();
    }

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(databaseOpenDuringStop).toEqual([true, true]);
    expect(shutdownEvents).toEqual(['queue-stopped', 'database-closing']);
    expect(dataSource.isInitialized).toBe(false);
  }, 120000);
});
