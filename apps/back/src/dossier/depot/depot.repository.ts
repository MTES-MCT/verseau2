import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DepotEntity } from './depot.entity';
import { DepotModel } from './depot.model';
import { DepotGateway } from './depot.gateway';
import { EtapeMetier } from '@lib/dossier';
import { mapDepotEntityToModel } from './depot.mapper';

@Injectable()
export class DepotRepository extends Repository<DepotEntity> implements DepotGateway {
  constructor(private dataSource: DataSource) {
    super(DepotEntity, dataSource.createEntityManager());
  }

  async createDepot(depot: Partial<DepotModel>): Promise<DepotModel> {
    const newDepot = this.create(depot);
    const savedDepot = await this.save(newDepot);
    return mapDepotEntityToModel(savedDepot);
  }

  async findDepotById(id: string): Promise<DepotModel | null> {
    const entity = await this.findOne({ where: { id }, relations: ['user'] });
    return entity ? mapDepotEntityToModel(entity) : null;
  }

  async findDepotByIdWithUser(id: string): Promise<DepotModel | null> {
    return await this.findDepotById(id);
  }

  async findAllDepotsByAdmin(): Promise<DepotModel[]> {
    const entities = await this.find({
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
    });
    return entities.map(mapDepotEntityToModel);
  }

  async updateDepot(id: string, updateData: Partial<DepotModel>): Promise<DepotModel | null> {
    await this.update(id, updateData);
    return await this.findDepotById(id);
  }

  async updateEtapeMetier(depotId: string, etapeMetier: EtapeMetier | null): Promise<DepotModel | null> {
    const entity = await this.findOne({ where: { id: depotId } });
    if (!entity) {
      return null;
    }
    entity.etapeMetier = etapeMetier;
    await this.save(entity);
    return mapDepotEntityToModel(entity);
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
}
