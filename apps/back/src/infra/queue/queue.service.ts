import { Inject, Injectable } from '@nestjs/common';
import { QueueJob, Queue } from './queue';
import type { PgBoss } from '../pgboss/pgboss';
import { PGBOSS } from '@pgboss/pgboss.module';
@Injectable()
export class QueueService implements Queue<object> {
  constructor(@Inject(PGBOSS) private readonly pgboss: PgBoss<object>) {}

  async send<TData = object>(name: string, data?: TData): Promise<string | null> {
    return await this.pgboss.send(name, data as object);
  }

  async work<TData>(name: string, handler: (job: QueueJob<TData>[]) => Promise<unknown>): Promise<string> {
    return await this.pgboss.work(name, handler);
  }
}
