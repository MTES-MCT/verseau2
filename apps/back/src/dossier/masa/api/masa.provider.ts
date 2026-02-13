import { Inject, Injectable } from '@nestjs/common';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';

@Injectable()
export class MasaProvider {
  constructor(@Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway) {}

  async findChargeEntranteMaxAndTranche(
    steuSandreCda: string,
    year: number,
  ): Promise<{ chargeMax: number; trancheLabel: string; trancheRfa: string } | null> {
    // TODO: Replace this call with an API call to Masa when available
    return this.roseauGateway.findChargeEntranteMaxAndTranche(steuSandreCda, year);
  }
}
