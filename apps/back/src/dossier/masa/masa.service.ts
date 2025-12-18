import { Inject, Injectable } from '@nestjs/common';
import { MasaGateway } from './masa.gateway';
import { MasaWebhookPayloadDto } from './masa.model';
import { DepotGateway } from '../depot/depot.gateway';

@Injectable()
export class MasaService {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
  ) {}

  async processRetourAgentVerseau(payload: MasaWebhookPayloadDto) {
    const depot = await this.depotGateway.findDepotById(payload.versau2DepotId);
    if (!depot) {
      throw new Error('Depot not found');
    }
    return await this.masaGateway.saveMasaRetour({
      depotId: payload.versau2DepotId,
      numeroDepotVerseau1: payload.numeroDepotVerseau1,
      statut: payload.statut,
      rapport: payload.rapport,
    });
  }
}
