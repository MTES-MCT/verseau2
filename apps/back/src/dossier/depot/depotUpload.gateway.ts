import type { Queue } from '@queue/queue';
import type { DepotModel, UpdateDepotModel } from './depot.model';

export interface DepotUploadTransaction {
  create(data: Partial<DepotModel>): Promise<DepotModel>;
  findForUpdate(id: string): Promise<DepotModel | null>;
  save(depot: Omit<DepotModel, 'etapeMetier'> & Pick<UpdateDepotModel, 'etapeMetier'>): Promise<DepotModel>;
  send: Queue['send'];
}

export interface DepotUploadGateway {
  transaction<T>(operation: (transaction: DepotUploadTransaction) => Promise<T>): Promise<T>;
}

export const DepotUploadGateway = Symbol('DepotUploadGateway');
