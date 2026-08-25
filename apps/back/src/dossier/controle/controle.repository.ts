import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ControleEntity } from './controle.entity';
import { ControleModel, ControleModelWithoutDepot, CreateControleModel } from './controle.model';
import { ControleGateway } from './controle.gateway';

@Injectable()
export class ControleRepository extends Repository<ControleEntity> implements ControleGateway {
  constructor(private dataSource: DataSource) {
    super(ControleEntity, dataSource.createEntityManager());
  }
  async createControle(controle: CreateControleModel): Promise<ControleModel> {
    const newControle = this.create(controle);
    const savedControle = await this.save(newControle);
    return { ...savedControle };
  }

  async createControles(controles: CreateControleModel[], manager?: EntityManager): Promise<ControleModel[]> {
    const m = manager || this.manager;
    const newControles = m.create(ControleEntity, controles);
    const savedControles = await m.save(newControles);
    return [...savedControles];
  }

  async findByDepotId(depotId: string): Promise<ControleModelWithoutDepot[]> {
    return await this.find({
      where: { depot: { id: depotId } },
    });
  }
}
