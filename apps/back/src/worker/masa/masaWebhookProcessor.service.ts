import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotUploadGateway } from '@dossier/depot/depotUpload.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { AsyncTask } from '@worker/asyncTask';
import { QueueName, RapportDestinataire } from '@queue/queue';
import type { DiffusionRapportJobData } from '@queue/queue';

interface MasaProcessorData {
  masaId: string;
  depotId: string;
}

@Injectable()
export class MasaWebhookProcessorService implements AsyncTask<MasaProcessorData> {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotUploadGateway) private readonly depotUploadGateway: DepotUploadGateway,
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

      // Le verrou sérialise les retours concurrents. La transition et le job de
      // diffusion doivent être commités ensemble pour permettre une reprise.
      const transitioned = await this.depotUploadGateway.transaction(async (transaction) => {
        const lockedDepot = await transaction.findForUpdate(depotId);
        if (!lockedDepot) {
          throw new Error(`Depot not found: ${depotId}`);
        }
        if (lockedDepot.status !== DepotStatus.EN_COURS_DE_TRAITEMENT) {
          return false;
        }
        // Le .ack peut déclencher le webhook avant la persistance de SFTP_COMPLETED.
        // Lever l'erreur laisse pg-boss réessayer le même job, sans perdre le retour.
        if (lockedDepot.step === DepotStep.SFTP_IN_PROGRESS) {
          throw new Error(`SFTP still in progress for depot: ${depotId}`);
        }
        if (lockedDepot.step !== DepotStep.SFTP_COMPLETED) {
          this.logger.warn('Depot is not awaiting a MASA return, skipping transition', { masaId, depotId });
          return false;
        }

        await transaction.save({
          ...lockedDepot,
          status: this.mapMasaStatusToDepotStatus(masa.statut),
          step: DepotStep.MASA_CALLED_ENPOINT,
          stepHistory: [...(lockedDepot.stepHistory ?? []), DepotStep.MASA_CALLED_ENPOINT],
          etapeMetier: null,
        });
        await transaction.send<DiffusionRapportJobData>(QueueName.diffusion_rapport, {
          depotId,
          masaId,
          destinataires: this.getRapportDestinataires(masa.statut),
        });
        return true;
      });
      if (!transitioned) {
        return;
      }

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
