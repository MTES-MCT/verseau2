import { ClsStore } from 'nestjs-cls';

export interface JobLogContext {
  queueName: string;
  jobId: string;
  depotId?: string;
  template?: number;
  retryCount?: number;
  retryLimit?: number;
  attempt?: number;
}

export interface CustomClsStore extends ClsStore {
  correlationId?: string;
  jobContext?: JobLogContext;
}
