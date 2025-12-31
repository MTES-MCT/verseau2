import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ControleEntity } from './controle.entity';
import { ControleModel, ControleModelWithoutDepot, CreateControleModel } from './controle.model';
import { ControleGateway } from './controle.gateway';
import { ControleType } from '@lib/dossier';

@Injectable()
export class ControleRepository extends Repository<ControleEntity> implements ControleGateway {
  constructor(private dataSource: DataSource) {
    super(ControleEntity, dataSource.createEntityManager());
  }
  async findControlesV2ByDepotId(depotId: string): Promise<ControleModelWithoutDepot[]> {
    return await this.find({
      where: { depot: { id: depotId }, type: ControleType.CONTROLE_V2 },
    });
  }

  async findByUserId(userId: string): Promise<ControleModel[]> {
    return await this.find({
      where: { depot: { user: { id: userId } } },
      relations: ['depot'],
    });
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

  async findById(id: string): Promise<ControleModel | null> {
    return await this.findOne({ where: { id } });
  }

  async findByDepotId(depotId: string): Promise<ControleModelWithoutDepot[]> {
    return await this.find({
      where: { depot: { id: depotId } },
    });
  }

  async findAll(): Promise<ControleModel[]> {
    return await this.find();
  }

  async updateControle(id: string, updateData: Partial<ControleModel>): Promise<ControleModel | null> {
    await this.update(id, updateData);
    return await this.findById(id);
  }
}
