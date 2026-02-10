import { EmailParams, EmailTemplate } from '@notification/notification';

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
  controle_metier = 'controle_metier',
  controle_sandre = 'controle_sandre',
  process_after_masa_webhook = 'process_after_masa_webhook',
}

export interface QueueOptions {
  batchSize: number;
}

export const QueueGateway = Symbol('QUEUE');
export const PGBOSS = Symbol('PGBOSS');
export const QUEUE_PREFIX = Symbol('QUEUE_PREFIX');

export function resolveQueueName(name: string, prefix?: string): string {
  return prefix ? `${prefix}__${name}` : name;
}

export interface EmailJobData {
  params: EmailParams;
  template: EmailTemplate;
}
