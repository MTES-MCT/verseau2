import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { AsyncTask } from '@worker/asyncTask';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { DiffusionRapportJobData, Queue } from '@queue/queue';

interface MasaProcessorData {
  masaId: string;
  depotId: string;
}

@Injectable()
export class MasaWebhookProcessorService implements AsyncTask<MasaProcessorData> {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MasaWebhookProcessorService.name);
  }

  async process(data: MasaProcessorData): Promise<void> {
    const { masaId, depotId } = data;
    this.logger.log(`Processing MASA report`, { masaId, depotId });

    try {
      // 1. Fetch MASA and Depot data
      const masa = await this.masaGateway.findById(masaId);
      if (!masa) {
        throw new Error(`MASA not found: ${masaId}`);
      }

      const depot = await this.depotGateway.findDepotByIdWithUser(depotId);
      if (!depot) {
        throw new Error(`Depot not found: ${depotId}`);
      }

      // 2. Mettre à jour le statut du dépôt selon le retour MASA
      const newStatus = this.mapMasaStatusToDepotStatus(masa.statut);
      await this.depotGateway.updateDepot(depotId, {
        status: newStatus,
        step: DepotStep.MASA_CALLED_ENPOINT,
        etapeMetier: null,
      });

      // 3. Déléguer la diffusion du rapport selon le statut MASA.
      await this.queueService.send<DiffusionRapportJobData>(QueueName.diffusion_rapport, {
        depotId,
        masaId,
        destinataires: this.getRapportDestinataires(masa.statut),
      });

      this.logger.log(`MASA report processing completed, delegated to diffusion_rapport`, { masaId, depotId });
    } catch (error) {
      this.logger.error(`Failed to process MASA report`, {
        masaId,
        depotId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private mapMasaStatusToDepotStatus(masaStatus: MasaStatus): DepotStatus {
    switch (masaStatus) {
      case MasaStatus.INTEGRE:
        return DepotStatus.INTEGRE;
      case MasaStatus.INTEGRATION_PARTIELLE:
        return DepotStatus.INTEGRE_PARTIELLEMENT;
      case MasaStatus.REFUSE:
        return DepotStatus.REJETE;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unknown MASA status: ${masaStatus}`);
    }
  }

  private getRapportDestinataires(masaStatus: MasaStatus): RapportDestinataire[] {
    if (masaStatus === MasaStatus.REFUSE) {
      return [RapportDestinataire.DEPOSANT];
    }

    return [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU];
  }
}
