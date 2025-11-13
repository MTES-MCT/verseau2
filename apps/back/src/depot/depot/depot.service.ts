import { Injectable, NotFoundException } from '@nestjs/common';
import { DepotRepository } from './depot.repository';
import { DepotEntity } from './depot.entity';
import { QueueName } from '@queue/queue';
import { QueueService } from '@queue/queue.service';

@Injectable()
export class DepotService {
  constructor(
    private readonly depotRepository: DepotRepository,
    private readonly queueService: QueueService,
  ) {}

  async create(
    depotData: Omit<DepotEntity, 'id' | 'path' | 'createdAt' | 'updatedAt' | 'setId'> & { buffer: string },
  ): Promise<DepotEntity> {
    const newDepot = await this.depotRepository.createDepot({
      ...depotData,
    });
    await this.queueService.send(QueueName.process_file, {
      id: newDepot.id,
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
