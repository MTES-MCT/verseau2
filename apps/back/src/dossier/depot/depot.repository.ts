import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DepotEntity } from './depot.entity';
import { DepotModel, UpdateDepotModel } from './depot.model';
import { DepotGateway } from './depot.gateway';
import { DepotStep } from '@lib/dossier';
import { mapDepotEntityToModel } from './depot.mapper';

@Injectable()
export class DepotRepository extends Repository<DepotEntity> implements DepotGateway {
  constructor(private dataSource: DataSource) {
    super(DepotEntity, dataSource.createEntityManager());
  }

  async createDepot(depot: Partial<DepotModel>): Promise<DepotModel> {
    const newDepot = this.create(depot);
    newDepot.updateStep(DepotStep.PENDING);
    const savedDepot = await this.save(newDepot);
    return mapDepotEntityToModel(savedDepot);
  }

  async findDepotById(id: string): Promise<DepotModel | null> {
    const entity = await this.findOne({ where: { id }, relations: ['user', 'masa'] });
    return entity ? mapDepotEntityToModel(entity) : null;
  }

  async findDepotByIdWithUser(id: string): Promise<DepotModel | null> {
    return await this.findDepotById(id);
  }

  async findAllDepotsByAdmin(): Promise<DepotModel[]> {
    const entities = await this.find({
      relations: ['user', 'masa'],
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
        console.log('Updated depot entity:', entity);
        return mapDepotEntityToModel(entity);
      }
      return null;
    });
  }

  async findByUserId(userId: string): Promise<DepotModel[]> {
    const entities = await this.find({
      where: { user: { id: userId } },
      relations: ['masa'],
      order: {
        createdAt: 'DESC',
      },
    });
    return entities.map(mapDepotEntityToModel);
  }

  async findByItvCdn(itvCdn: number): Promise<DepotModel[]> {
    const entities = await this.find({
      where: { itvCdn },
      relations: ['masa'],
      order: {
        createdAt: 'DESC',
      },
    });
    return entities.map(mapDepotEntityToModel);
  }
}
