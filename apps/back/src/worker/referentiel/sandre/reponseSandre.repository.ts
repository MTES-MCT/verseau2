import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ReponseSandreEntity } from './reponseSandre.entity';
import { ReponseSandreCreateModel, ReponseSandreModel } from './reponseSandre.model';
import { AcceptationStatus } from './sandre';
import { DepotRepository } from '@depot/depot/depot.repository';

@Injectable()
export class ReponseSandreRepository extends Repository<ReponseSandreEntity> {
  constructor(
    private dataSource: DataSource,
    private depotRepository: DepotRepository,
  ) {
    super(ReponseSandreEntity, dataSource.createEntityManager());
  }

  async createReponseSandre(data: Partial<ReponseSandreCreateModel>): Promise<ReponseSandreModel> {
    const depot = await this.depotRepository.findDepotById(data.depotId!);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${data.depotId} not found`);
    }
    const newReponse = this.create({
      ...data,
      depot: { id: depot.id },
    });
    const savedReponse = await this.save(newReponse);
    return { ...savedReponse };
  }

  async findReponseSandreById(id: string): Promise<ReponseSandreModel | null> {
    return await this.findOne({ where: { id } });
  }

  async updateReponseSandre(id: string, updateData: Partial<ReponseSandreModel>): Promise<ReponseSandreModel | null> {
    await this.update(id, updateData);
    return await this.findReponseSandreById(id);
  }

  async findByJeton(jeton: string): Promise<ReponseSandreModel | null> {
    return await this.findOne({ where: { jeton } });
  }

  async findByDepotId(depotId: string): Promise<ReponseSandreModel[]> {
    return await this.find({ where: { depot: { id: depotId } }, relations: ['depot'] });
  }

  async findByStatus(status: AcceptationStatus): Promise<ReponseSandreModel[]> {
    return await this.find({ where: { acceptationStatus: status } });
  }
}
