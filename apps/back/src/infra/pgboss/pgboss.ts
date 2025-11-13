export type SendOptions = {
  id?: string;
  priority?: number;
  startAfter?: number | string | Date;
  singletonKey?: string;
  singletonSeconds?: number;
  singletonNextSlot?: boolean;
  keepUntil?: number | string | Date;
  expireInSeconds?: number;
  retentionSeconds?: number;
  deleteAfterSeconds?: number;
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  retryDelayMax?: number;
};

export type WorkOptions = {
  includeMetadata?: boolean;
  priority?: boolean;
  batchSize?: number;
  ignoreStartAfter?: boolean;
  pollingIntervalSeconds?: number;
};

export type ReqData = unknown;

export type WorkHandler<ReqData> = (job: ReqData[]) => Promise<unknown>;

export interface PgBoss<TData = object> {
  createQueue(name: string): Promise<void>;
  send(
    name: string,
    data?: TData,
    options?: SendOptions,
  ): Promise<string | null>;
  work<ReqData = TData>(
    name: string,
    handler: WorkHandler<ReqData>,
  ): Promise<string>;
  work<ReqData = TData>(
    name: string,
    options: WorkOptions,
    handler: WorkHandler<ReqData>,
  ): Promise<string>;
}
