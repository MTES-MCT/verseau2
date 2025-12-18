import { Inject, Injectable } from '@nestjs/common';
import { MasaGateway } from './masa.gateway';
import { MasaWebhookPayloadDto } from './masa.model';

@Injectable()
export class MasaService {
  constructor(@Inject(MasaGateway) private readonly masaGateway: MasaGateway) {}

  async processRetourAgentVerseau(payload: MasaWebhookPayloadDto) {
    return await this.masaGateway.saveMasaRetour({
      depotId: payload.versau2DepotId,
      numeroDepotVerseau1: payload.numeroDepotVerseau1,
      statut: payload.statut,
      rapport: payload.rapport,
    });
  }
}
