import { Injectable, NotFoundException } from '@nestjs/common';
import { DepotRepository } from './depot.repository';
import { DepotEntity } from './depot.entity';
import { DepotModel } from './depot.model';

@Injectable()
export class DepotService {
  constructor(private readonly depotRepository: DepotRepository) {}

  async create(
    depotData: Omit<DepotModel, 'id' | 'path' | 'createdAt' | 'updatedAt' | 'setId'> & { buffer: string },
  ): Promise<DepotModel> {
    const newDepot = await this.depotRepository.createDepot({
      ...depotData,
    });

    return newDepot;
  }

  async findById(id: string): Promise<DepotEntity> {
    const depot = await this.depotRepository.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return depot;
  }

  async findAll(): Promise<DepotEntity[]> {
    return await this.depotRepository.findAllDepots();
  }

  async update(id: string, updateData: Partial<Omit<DepotEntity, 'id' | 'createdAt'>>): Promise<DepotEntity> {
    const depot = await this.depotRepository.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    const updatedDepot = await this.depotRepository.updateDepot(id, updateData);
    if (!updatedDepot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return updatedDepot;
  }
}
