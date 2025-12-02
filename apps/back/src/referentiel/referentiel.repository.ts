import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferentielGateway } from './referentiel.gateway';
import { SteuEntity } from './roseau/entities/steu.entity';
import { CxnadmEntity } from './roseau/entities/cxnadm.entity';
import { ItvEntity } from './lanceleau/entities/itv.entity';

@Injectable()
export class ReferentielRepository implements ReferentielGateway {
  constructor(
    @InjectRepository(ItvEntity)
    private readonly itvRepository: Repository<ItvEntity>,
  ) {}

  async findItvBySteuAndIntervenant(cdOuvrageDepollution: string, cdIntervenant: string): Promise<string[]> {
    const results = await this.itvRepository
      .createQueryBuilder('itv')
      .select('itv.itv_cdn', 'itvCdn')
      .innerJoin(CxnadmEntity, 'cxnadm', 'itv.itv_cdn = cxnadm.steu_itv_cdn')
      .innerJoin(SteuEntity, 'steu', 'cxnadm.mo_steu_cdn = steu.steu_cdn')
      .where('steu.steu_sandre_cda = :cdOuvrageDepollution', {
        cdOuvrageDepollution,
      })
      .andWhere('itv.itv_rfa = :cdIntervenant', { cdIntervenant })
      .getRawMany<{ itvCdn: string }>();

    return results.map((result) => result.itvCdn);
  }
}
