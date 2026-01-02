import { Inject, Injectable } from '@nestjs/common';
import { MasaGateway } from './masa.gateway';
import { MasaWebhookPayloadDto } from './masa.model';
import { DepotGateway } from '../depot/depot.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class MasaService {
  private readonly logger = new LoggerService(MasaService.name);

  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(QueueGateway) private readonly queueService: Queue,
  ) {}

  async processRetourAgentVerseau(payload: MasaWebhookPayloadDto) {
    const depot = await this.depotGateway.findDepotById(payload.versau2DepotId);
    if (!depot) {
      throw new Error('Depot not found');
    }

    const existingMasa = await this.masaGateway.findByDepotId(payload.versau2DepotId);
    if (existingMasa) {
      this.logger.warn('MASA return already processed', { depotId: payload.versau2DepotId });
      return existingMasa;
    }

    const masaData = await this.masaGateway.saveMasaRetour({
      depotId: payload.versau2DepotId,
      numeroDepotVerseau1: payload.numeroDepotVerseau1,
      statut: payload.statut,
      rapport: payload.rapport,
    });

    await this.queueService.send(QueueName.process_after_masa_webhook, {
      masaId: masaData.id,
      depotId: payload.versau2DepotId,
    });

    this.logger.log('MASA return saved and job enqueued', {
      masaId: masaData.id,
      depotId: payload.versau2DepotId,
    });

    return masaData;
  }
}
