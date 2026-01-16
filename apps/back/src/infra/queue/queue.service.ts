import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CustomClsStore } from '@shared/logger/cls-store.interface';
import { Queue, QueueJob, QueueOptions, PGBOSS } from './queue';
import type { PgBoss } from './pgboss';

@Injectable()
export class QueueService implements Queue {
  constructor(
    @Inject(PGBOSS) private readonly pgboss: PgBoss<object>,
    private readonly cls: ClsService<CustomClsStore>,
  ) {}

  async send<TData = object>(name: string, data?: TData): Promise<string | null> {
    const correlationId = this.cls.get('correlationId');
    const enrichedData = correlationId ? { ...data, correlationId } : data;
    return await this.pgboss.send(name, enrichedData as object);
  }

  async work<TData>(
    name: string,
    options: QueueOptions,
    handler: (job: QueueJob<TData>[]) => Promise<unknown>,
  ): Promise<string> {
    return await this.pgboss.work(name, options, handler);
  }
}
