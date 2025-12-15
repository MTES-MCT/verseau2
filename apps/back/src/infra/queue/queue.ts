export interface Queue {
  send<T = object>(name: string, data?: T): Promise<string | null>;
  work<T = object>(
    name: string,
    options: QueueOptions,
    handler: (job: QueueJob<T>[]) => Promise<unknown>,
  ): Promise<string>;
}

export interface QueueJob<TData = object> {
  id: string;
  name: string;
  data: TData;
}

export enum QueueName {
  process_file = 'process_file',
  email = 'email',
  send_to_sftp = 'send_to_sftp',
  controle_v1 = 'controle_v1',
  controle_sandre = 'controle_sandre',
}

export interface QueueOptions {
  batchSize: number;
}

export const QueueGateway = Symbol('QUEUE');
export const PGBOSS = Symbol('PGBOSS');
