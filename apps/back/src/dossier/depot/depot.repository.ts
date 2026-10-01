import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DepotEntity } from './depot.entity';
import { DepotModel, UpdateDepotModel } from './depot.model';
import { DepotGateway, DepotTransitionJob } from './depot.gateway';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { QueueGateway, type Queue } from '@queue/queue';
import { mapDepotEntityToModel } from './depot.mapper';

@Injectable()
export class DepotRepository extends Repository<DepotEntity> implements DepotGateway {
  constructor(
    private dataSource: DataSource,
    @Inject(QueueGateway) private readonly queue: Queue,
  ) {
    super(DepotEntity, dataSource.createEntityManager());
  }

  async createDepot(depot: Partial<DepotModel>): Promise<DepotModel> {
    const newDepot = this.create(depot);
    newDepot.updateStep(DepotStep.PENDING);
    const savedDepot = await this.save(newDepot);
    return mapDepotEntityToModel(savedDepot);
  }

  async findDepotById(id: string): Promise<DepotModel | null> {
    const entity = await this.findOne({ where: { id }, relations: { user: true, masa: true } });
    return entity ? mapDepotEntityToModel(entity) : null;
  }

  async findDepotByIdWithUser(id: string): Promise<DepotModel | null> {
    return await this.findDepotById(id);
  }

  async findAllDepotsByAdmin(): Promise<DepotModel[]> {
    const entities = await this.find({
      relations: { user: true, masa: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return entities.map(mapDepotEntityToModel);
  }
  async updateDepot(id: string, updateData: UpdateDepotModel): Promise<DepotModel | null> {
    return await this.manager.transaction(async (manager) => {
      const entity = await manager.findOne(DepotEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (entity) {
        if (updateData.step !== undefined) {
          entity.updateStep(updateData.step);
        }
        Object.assign(entity, updateData);

        await manager.save(entity);
        return mapDepotEntityToModel(entity);
      }
      return null;
    });
  }

  async findByUserId(userId: string): Promise<DepotModel[]> {
    const entities = await this.find({
      where: { user: { id: userId } },
      relations: { masa: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return entities.map(mapDepotEntityToModel);
  }

  async transitionDepot(
    id: string,
    fromSteps: DepotStep[],
    updateData: UpdateDepotModel,
    job?: DepotTransitionJob,
  ): Promise<boolean> {
    return this.manager.transaction(async (manager) => {
      const entity = await manager.findOne(DepotEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !entity ||
        entity.status !== DepotStatus.EN_COURS_DE_TRAITEMENT ||
        !entity.step ||
        !fromSteps.includes(entity.step)
      ) {
        return false;
      }
      if (updateData.step !== undefined) {
        entity.updateStep(updateData.step);
      }
      Object.assign(entity, updateData);
      await manager.save(entity);
      if (job) {
        const jobId = await this.queue.send(job.name, job.data, {
          db: { executeSql: async (sql, values) => ({ rows: await manager.query<object[]>(sql, values) }) },
        });
        if (!jobId) {
          throw new Error(`Failed to enqueue ${job.name}`);
        }
      }
      return true;
    });
  }

  async findByItvCdn(itvCdn: number): Promise<DepotModel[]> {
    const entities = await this.find({
      where: { itvCdn },
      relations: { masa: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return entities.map(mapDepotEntityToModel);
  }
}
