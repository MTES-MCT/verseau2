import type { JobScheduler } from '@queue/queue';
import type { DepotTransactionGateway } from './depotTransaction.gateway';

export interface DepotTransactionScope {
  depots: DepotTransactionGateway;
  jobs: JobScheduler;
}

export interface DepotUnitOfWork {
  run<T>(operation: (scope: DepotTransactionScope) => Promise<T>): Promise<T>;
}

export const DepotUnitOfWork = Symbol('DepotUnitOfWork');
