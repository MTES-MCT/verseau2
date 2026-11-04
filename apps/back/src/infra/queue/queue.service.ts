import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CustomClsStore } from '@shared/logger/cls-store.interface';
import { Queue, QueueJob, QueueOptions, PGBOSS, QUEUE_PREFIX, resolveQueueName } from './queue';
import type { PgBoss, SendOptions } from './pgboss';
import { traceQueueProcess, traceQueuePublish } from '../../monitoring/queueTracing';

@Injectable()
export class QueueService implements Queue {
  constructor(
    @Inject(PGBOSS) private readonly pgboss: PgBoss<object>,
    private readonly cls: ClsService<CustomClsStore>,
    @Inject(QUEUE_PREFIX) private readonly prefix: string | undefined,
  ) {}

  async send<TData = object>(name: string, data?: TData, options?: SendOptions): Promise<string | null> {
    const resolvedName = resolveQueueName(name, this.prefix);
    const correlationId = this.cls.get('correlationId');
    const enrichedData = correlationId ? { ...data, correlationId } : data;
    return await traceQueuePublish(
      name,
      enrichedData as object | undefined,
      async (payload) => await this.pgboss.send(resolvedName, payload, options),
    );
  }

  async work<TData>(
    name: string,
    options: QueueOptions,
    handler: (job: QueueJob<TData>[]) => Promise<unknown>,
  ): Promise<string> {
    const resolvedName = resolveQueueName(name, this.prefix);
    return await this.pgboss.work(
      resolvedName,
      options,
      async (jobs: QueueJob<TData>[]) => await traceQueueProcess(name, jobs, handler),
    );
  }
}
