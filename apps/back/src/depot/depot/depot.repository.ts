import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DepotEntity } from './depot.entity';
import { DepotModel } from './depot.model';

@Injectable()
export class DepotRepository extends Repository<DepotEntity> {
  constructor(private dataSource: DataSource) {
    super(DepotEntity, dataSource.createEntityManager());
  }

  async createDepot(depot: Partial<DepotModel>): Promise<DepotModel> {
    const newDepot = this.create(depot);
    const savedDepot = await this.save(newDepot);
    return { ...savedDepot };
  }

  async findDepotById(id: string): Promise<DepotEntity | null> {
    return await this.findOne({ where: { id } });
  }

  async findAllDepots(): Promise<DepotEntity[]> {
    return await this.find();
  }

  async updateDepot(id: string, updateData: Partial<DepotEntity>): Promise<DepotEntity | null> {
    await this.update(id, updateData);
    return await this.findDepotById(id);
  }
}
