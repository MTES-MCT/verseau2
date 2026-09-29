import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueueGateway, type Queue } from '@queue/queue';
import { DepotEntity } from './depot.entity';
import { DepotUploadGateway, DepotUploadTransaction } from './depotUpload.gateway';
import { mapDepotEntityToModel } from './depot.mapper';

@Injectable()
export class DepotUploadRepository implements DepotUploadGateway {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(QueueGateway) private readonly queue: Queue,
  ) {}

  async transaction<T>(operation: (transaction: DepotUploadTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DepotEntity);
      return operation({
        create: async (data) => mapDepotEntityToModel(await repository.save(repository.create(data))),
        findForUpdate: async (id) => {
          const depot = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
          return depot ? mapDepotEntityToModel(depot) : null;
        },
        save: async (depot) => mapDepotEntityToModel(await repository.save(repository.create(depot))),
        send: async (name, data, options) => {
          const id = await this.queue.send(name, data, {
            ...options,
            db: { executeSql: async (sql, values) => ({ rows: await manager.query<object[]>(sql, values) }) },
          });
          if (!id) {
            throw new Error(`Failed to enqueue ${name}`);
          }
          return id;
        },
      });
    });
  }
}
