import { Inject, Injectable } from '@nestjs/common';
import { Queue } from './queue';
import { PGBOSS } from '../pgboss/pgboss.module';
import type { PgBoss } from '../pgboss/pgboss';
@Injectable()
export class QueueService implements Queue<object> {
  constructor(@Inject(PGBOSS) private readonly pgboss: PgBoss<object>) {}

  async send(name: string, data?: object): Promise<string | null> {
    return await this.pgboss.send(name, data);
  }

  async work(
    name: string,
    handler: (job: object[]) => Promise<unknown>,
  ): Promise<string> {
    return await this.pgboss.work(name, handler);
  }
}
