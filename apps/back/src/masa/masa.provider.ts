import { Inject, Injectable } from '@nestjs/common';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { ChargeEntranteMaxComparison } from './controleMetier.dto';

@Injectable()
export class MasaProvider {
  constructor(@Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway) {}

  async findChargeEntranteMaxComparison(
    steuSandreCdas: string[],
    year: number,
  ): Promise<Map<string, ChargeEntranteMaxComparison>> {
    // TODO: Replace this call with a single batch API call to Masa when available
    return this.roseauGateway.findChargeEntranteMaxComparisonBatch(steuSandreCdas, year);
  }
}
