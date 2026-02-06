import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ReponseSandreEntity } from './reponseSandre.entity';
import { ReponseSandreCreateModel, ReponseSandreModel } from './reponseSandre.model';
import { SandreAcceptationStatus } from '@lib/dossier';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { ReponseSandreGateway } from './reponseSandre.gateway';
import { LoggerService } from '@shared/logger/logger.service';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ReponseSandreRepository extends Repository<ReponseSandreEntity> implements ReponseSandreGateway {
  private readonly logger = new LoggerService(ReponseSandreRepository.name);

  constructor(
    private dataSource: DataSource,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
  ) {
    super(ReponseSandreEntity, dataSource.createEntityManager());
  }

  async createReponseSandre(data: Partial<ReponseSandreCreateModel>): Promise<ReponseSandreModel> {
    const depot = await this.depotGateway.findDepotById(data.depotId!);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${data.depotId} not found`);
    }
    const newReponse = this.create({
      ...data,
      depot: { id: depot.id },
    });
    try {
      const savedReponse = await this.save(newReponse);
      return { ...savedReponse };
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION) {
        this.logger.warn('ReponseSandre already exists for this depot, skipping duplicate insert', {
          depotId: data.depotId,
        });
        const existing = await this.findByDepotId(data.depotId!);
        return existing[0];
      }
      throw error;
    }
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

  async findByStatus(status: SandreAcceptationStatus): Promise<ReponseSandreModel[]> {
    return await this.find({ where: { acceptationStatus: status } });
  }
}
