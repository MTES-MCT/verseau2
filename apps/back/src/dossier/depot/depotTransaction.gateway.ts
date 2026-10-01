import type { DepotModel } from './depot.model';

/** Persistence operations bound to an active transaction. */
export interface DepotTransactionGateway {
  findForUpdate(id: string): Promise<DepotModel | null>;
  save(depot: DepotModel): Promise<DepotModel>;
}
