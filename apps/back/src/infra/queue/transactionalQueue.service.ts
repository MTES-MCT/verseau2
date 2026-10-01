import { Inject, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { QueueGateway, type Queue, type JobScheduler } from './queue';

@Injectable()
export class TransactionalQueueService {
  constructor(@Inject(QueueGateway) private readonly queue: Queue) {}

  forTransaction(manager: EntityManager): JobScheduler {
    return {
      enqueue: async (name, data) => {
        const id = await this.queue.send(name, data, {
          db: { executeSql: async (sql, values) => ({ rows: await manager.query<object[]>(sql, values) }) },
        });
        if (!id) {
          throw new Error(`Failed to enqueue ${name}`);
        }
        return id;
      },
    };
  }
}
