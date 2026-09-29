import { Inject, Injectable } from '@nestjs/common';
import { MasaGateway } from './masa.gateway';
import { type MasaWebhookPayloadDto } from './masa.schema';
import { type MasaWebhookResult } from './masa.model';
import { DepotGateway } from '../depot/depot.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { mapWebhookStatusToMasaStatus } from './masa.mapper';
import { isDepotAwaitingMasaRetour } from './masaDepotState';

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

  async processRetourAgentVerseau(payload: MasaWebhookPayloadDto): Promise<MasaWebhookResult> {
    const depot = await this.depotGateway.findDepotById(payload.verseau2DepotId);
    if (!depot) {
      throw new Error('Depot not found');
    }

    const statut = mapWebhookStatusToMasaStatus(payload.statut);
    if (statut === null) {
      // Statut non final (en cours de traitement côté MASA) : acquitté sans persister
      // ni transitionner le dépôt, pour qu'un statut final ultérieur soit traité.
      this.logger.log('MASA webhook received with a non-final status, acknowledged without processing', {
        depotId: payload.verseau2DepotId,
        statutMasa: payload.statut,
      });
      return { processed: false, statutMasa: payload.statut };
    }

    const existingMasa = await this.masaGateway.findByDepotId(payload.verseau2DepotId);
    if (existingMasa) {
      if (isDepotAwaitingMasaRetour(depot)) {
        // Le retour a déjà été sauvegardé mais le dépôt n'a jamais transitionné : le job
        // process_after_masa_webhook n'a probablement jamais été enfilé (échec de `send`
        // après la sauvegarde) ou n'est pas encore traité. On ré-enfile pour réparer la
        // livraison : la précondition d'état du processeur rend un job en double inoffensif.
        await this.queueService.send(QueueName.process_after_masa_webhook, {
          masaId: existingMasa.id,
          depotId: payload.verseau2DepotId,
        });
        this.logger.warn('MASA return already saved but depot still awaiting processing, re-enqueued job', {
          masaId: existingMasa.id,
          depotId: payload.verseau2DepotId,
        });
      } else {
        this.logger.warn('MASA return already processed', { depotId: payload.verseau2DepotId });
      }
      return existingMasa;
    }

    const masaData = await this.masaGateway.saveMasaRetour({
      depotId: payload.verseau2DepotId,
      numeroDepotVerseau1: payload.numeroDepotVerseau1,
      statut,
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
