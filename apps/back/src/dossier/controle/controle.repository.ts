import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControleEntity } from './controle.entity';
import { ControleModel, ControleModelWithoutDepot, CreateControleModel } from './controle.model';
import { ControleGateway } from './controle.gateway';

@Injectable()
export class ControleRepository extends Repository<ControleEntity> implements ControleGateway {
  constructor(private dataSource: DataSource) {
    super(ControleEntity, dataSource.createEntityManager());
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

  async createControles(controles: CreateControleModel[]): Promise<ControleModel[]> {
    const newControles = this.create(controles);
    const savedControles = await this.save(newControles);
    // return { ...savedControles };
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
