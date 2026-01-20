import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepotModel, DepotModel } from './depot.model';
import { DepotGateway } from './depot.gateway';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { S3 } from '@infra/s3/s3';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class DepotService {
  constructor(
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DepotService.name);
  }

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

  async findDepotByIdWithUser(id: string): Promise<DepotModel> {
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

  async findByItvCdn(itvCdn: number): Promise<DepotModel[]> {
    return await this.depotGateway.findByItvCdn(itvCdn);
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

  async downloadRapport(depotId: string): Promise<Buffer> {
    const depot = await this.findById(depotId);

    if (!depot.rapportPath) {
      throw new NotFoundException(`Rapport not found for depot: ${depotId}`);
    }
    try {
      return await this.s3.download(depot.rapportPath);
    } catch (error) {
      this.logger.error(
        `Failed to download rapport for depot ${depotId} from path ${depot.rapportPath}`,
        (error as Error).message,
      );
      throw new NotFoundException(`Rapport not found in storage for depot: ${depotId}`);
    }
  }

  async downloadXml(depotId: string): Promise<Buffer> {
    const depot = await this.findById(depotId);

    if (!depot.path) {
      throw new NotFoundException(`XML file not found for depot: ${depotId}`);
    }

    try {
      return await this.s3.download(depot.path);
    } catch (error) {
      this.logger.error(
        `Failed to download XML for depot ${depotId} from path ${depot.path}`,
        (error as Error).message,
      );
      throw new NotFoundException(`XML file not found in storage for depot: ${depotId}`);
    }
  }
}
