import { Inject, Injectable } from '@nestjs/common';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { ChargeEntranteMaxAndTranche } from './controleMetier.dto';

@Injectable()
export class MasaProvider {
  constructor(@Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway) {}

  async findChargeEntranteMaxAndTranche(
    steuSandreCdas: string[],
    year: number,
  ): Promise<Map<string, ChargeEntranteMaxAndTranche>> {
    // TODO: Replace this call with a single batch API call to Masa when available
    return this.roseauGateway.findChargeEntranteMaxAndTrancheBatch(steuSandreCdas, year);
  }
}
