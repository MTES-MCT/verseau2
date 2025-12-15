import { Inject, Injectable } from '@nestjs/common';
import { Queue, QueueJob, QueueOptions, PGBOSS } from './queue';
import type { PgBoss } from './pgboss';

@Injectable()
export class QueueService implements Queue {
  constructor(@Inject(PGBOSS) private readonly pgboss: PgBoss<object>) {}

  async send<TData = object>(name: string, data?: TData): Promise<string | null> {
    return await this.pgboss.send(name, data as object);
  }

  async work<TData>(
    name: string,
    options: QueueOptions,
    handler: (job: QueueJob<TData>[]) => Promise<unknown>,
  ): Promise<string> {
    return await this.pgboss.work(name, options, handler);
  }
}
