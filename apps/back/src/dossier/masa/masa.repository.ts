import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MasaEntity, MasaStatus } from './masa.entity';
import { MasaGateway } from './masa.gateway';
import { MasaModel } from './masa.model';

@Injectable()
export class MasaRepository extends Repository<MasaEntity> implements MasaGateway {
  constructor(private dataSource: DataSource) {
    super(MasaEntity, dataSource.createEntityManager());
  }

  async saveMasaRetour(data: {
    depotId: string;
    numeroDepotVerseau1: string;
    statut: MasaStatus;
    rapport: string;
  }): Promise<MasaModel> {
    const masa = this.create({
      depotId: data.depotId,
      numeroDepotVerseau1: data.numeroDepotVerseau1,
      statut: data.statut,
      rapport: data.rapport,
    });
    return await this.save(masa);
  }

  async findById(id: string): Promise<MasaModel | null> {
    return await this.findOne({ where: { id } });
  }

  async findByDepotId(depotId: string): Promise<MasaModel | null> {
    return await this.findOne({ where: { depotId } });
  }
}
