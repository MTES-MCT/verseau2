import { Injectable, NotFoundException } from '@nestjs/common';
import { DepotRepository } from './depot.repository';
import { DepotModel } from './depot.model';

@Injectable()
export class DepotService {
  constructor(private readonly depotRepository: DepotRepository) {}

  async create(depotData: Omit<DepotModel, 'id' | 'path' | 'createdAt' | 'updatedAt' | 'setId'>): Promise<DepotModel> {
    const newDepot = await this.depotRepository.createDepot({
      ...depotData,
    });

    return newDepot;
  }

  async findById(id: string): Promise<DepotModel> {
    const depot = await this.depotRepository.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return depot;
  }

  async findAll(): Promise<DepotModel[]> {
    return await this.depotRepository.findAllDepots();
  }

  async update(id: string, updateData: Partial<Omit<DepotModel, 'id' | 'createdAt'>>): Promise<DepotModel> {
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
