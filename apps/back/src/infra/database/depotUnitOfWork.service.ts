import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { DepotUnitOfWork, DepotTransactionScope } from '@dossier/depot/depotUnitOfWork.gateway';
import { DepotTransactionRepository } from '@dossier/depot/depotTransaction.repository';
import { TransactionalQueueService } from '@queue/transactionalQueue.service';

@Injectable()
export class DepotUnitOfWorkService implements DepotUnitOfWork {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queue: TransactionalQueueService,
  ) {}

  async run<T>(operation: (scope: DepotTransactionScope) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation({
        depots: new DepotTransactionRepository(manager),
        jobs: this.queue.forTransaction(manager),
      }),
    );
  }
}
