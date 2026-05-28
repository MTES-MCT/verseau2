import { Inject, Injectable } from '@nestjs/common';
import { MasaGateway } from './masa.gateway';
import { type MasaWebhookPayloadDto } from './masa.schema';
import { DepotGateway } from '../depot/depot.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { mapWebhookStatusToMasaStatus } from './masa.mapper';

@Injectable()
export class MasaService {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MasaService.name);
  }

  async processRetourAgentVerseau(payload: MasaWebhookPayloadDto) {
    const depot = await this.depotGateway.findDepotById(payload.verseau2DepotId);
    if (!depot) {
      throw new Error('Depot not found');
    }

    const existingMasa = await this.masaGateway.findByDepotId(payload.verseau2DepotId);
    if (existingMasa) {
      this.logger.warn('MASA return already processed', { depotId: payload.verseau2DepotId });
      return existingMasa;
    }

    const masaData = await this.masaGateway.saveMasaRetour({
      depotId: payload.verseau2DepotId,
      numeroDepotVerseau1: payload.numeroDepotVerseau1,
      statut: mapWebhookStatusToMasaStatus(payload.statut),
      statutMasa: payload.statut,
      rapport: payload.rapport,
    });

    await this.queueService.send(QueueName.process_after_masa_webhook, {
      masaId: masaData.id,
      depotId: payload.verseau2DepotId,
    });

    this.logger.log('MASA return saved and job enqueued', {
      masaId: masaData.id,
      depotId: payload.verseau2DepotId,
    });

    return masaData;
  }
}
