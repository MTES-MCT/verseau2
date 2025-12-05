import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepotModel, DepotModel } from './depot.model';
import { DepotGateway } from './depot.gateway';

@Injectable()
export class DepotService {
  constructor(@Inject(DepotGateway) private readonly depotGateway: DepotGateway) {}

  async create(depotData: CreateDepotModel): Promise<DepotModel> {
    const newDepot = await this.depotGateway.createDepot({
      ...depotData,
    });

    return newDepot;
  }

  async findById(id: string): Promise<DepotModel> {
    const depot = await this.depotGateway.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return depot;
  }

  async findAllByAdmin(): Promise<DepotModel[]> {
    return await this.depotGateway.findAllDepotsByAdmin();
  }

  async findByUserId(userId: string): Promise<DepotModel[]> {
    return await this.depotGateway.findByUserId(userId);
  }

  async update(id: string, updateData: Partial<Omit<DepotModel, 'id' | 'createdAt'>>): Promise<DepotModel> {
    const depot = await this.depotGateway.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    const updatedDepot = await this.depotGateway.updateDepot(id, updateData);
    if (!updatedDepot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return updatedDepot;
  }
}
