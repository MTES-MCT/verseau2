import type { EntityManager, Repository } from 'typeorm';
import { DepotEntity } from './depot.entity';
import type { DepotModel } from './depot.model';
import type { DepotTransactionGateway } from './depotTransaction.gateway';
import { mapDepotEntityToModel } from './depot.mapper';

export class DepotTransactionRepository implements DepotTransactionGateway {
  private readonly repository: Repository<DepotEntity>;

  constructor(manager: EntityManager) {
    this.repository = manager.getRepository(DepotEntity);
  }

  async findForUpdate(id: string): Promise<DepotModel | null> {
    const depot = await this.repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    return depot ? mapDepotEntityToModel(depot) : null;
  }

  async save(depot: DepotModel): Promise<DepotModel> {
    return mapDepotEntityToModel(await this.repository.save(this.repository.create(depot)));
  }
}
