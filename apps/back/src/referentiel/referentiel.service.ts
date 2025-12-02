import { Inject, Injectable } from '@nestjs/common';
import { ReferentielGateway } from './referentiel.gateway';

@Injectable()
export class ReferentielService {
  constructor(@Inject(ReferentielGateway) private readonly referentielGateway: ReferentielGateway) {}

  async findItvBySteuAndIntervenant(cdOuvrageDepollution: string, cdIntervenant: string): Promise<string[]> {
    return this.referentielGateway.findItvBySteuAndIntervenant(cdOuvrageDepollution, cdIntervenant);
  }
}
