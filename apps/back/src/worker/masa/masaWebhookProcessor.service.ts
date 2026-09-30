import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotUploadGateway } from '@dossier/depot/depotUpload.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { isDepotAwaitingMasaRetour, isDepotSendingToMasa } from '@dossier/masa/masaDepotState';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { AsyncTask } from '@worker/asyncTask';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { DiffusionRapportJobData, Queue } from '@queue/queue';

const SFTP_DEFERRAL_SECONDS = 5;
const MAX_SFTP_DEFERRALS = 12; // Une minute d'attente, puis échec visible avec les retries bornés de pg-boss.

interface MasaProcessorData {
  masaId: string;
  depotId: string;
  sftpDeferralCount?: number;
}

@Injectable()
export class MasaWebhookProcessorService implements AsyncTask<MasaProcessorData> {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(DepotUploadGateway) private readonly depotUploadGateway: DepotUploadGateway,
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

      // Le .ack peut déclencher le webhook avant que le processeur SFTP persiste sa fin.
      // Ne pas acquitter ce job sans suite, ni transitionner avant la réussite de l'envoi.
      if (isDepotSendingToMasa(depot)) {
        const sftpDeferralCount = data.sftpDeferralCount ?? 0;
        if (sftpDeferralCount >= MAX_SFTP_DEFERRALS) {
          throw new Error(`SFTP completion timeout while processing MASA return for depot: ${depotId}`);
        }
        const jobId = await this.queueService.send<MasaProcessorData>(
          QueueName.process_after_masa_webhook,
          { ...data, sftpDeferralCount: sftpDeferralCount + 1 },
          { startAfter: SFTP_DEFERRAL_SECONDS },
        );
        if (!jobId) {
          throw new Error(`Failed to defer MASA return while SFTP is in progress for depot: ${depotId}`);
        }
        this.logger.log('MASA return deferred until SFTP completes', {
          masaId,
          depotId,
          sftpDeferralCount: sftpDeferralCount + 1,
        });
        return;
      }

      // 2. Un retour MASA ne peut transitionner qu'un dépôt en attente de ce retour
      // (envoi SFTP réussi, statut EN_COURS_DE_TRAITEMENT). Sinon, no-op idempotent :
      // une livraison en double ou un re-job pg-boss ne doit ni re-transitionner le
      // dépôt ni re-déclencher la diffusion du rapport.
      if (!isDepotAwaitingMasaRetour(depot)) {
        this.logger.warn('Depot is not awaiting a MASA return, skipping transition', {
          masaId,
          depotId,
          status: depot.status,
          step: depot.step,
        });
        return;
      }

      // Le verrou sérialise les retours concurrents. La transition et le job de
      // diffusion doivent être commités ensemble pour permettre une reprise.
      const transitioned = await this.depotUploadGateway.transaction(async (transaction) => {
        const lockedDepot = await transaction.findForUpdate(depotId);
        if (!lockedDepot) {
          throw new Error(`Depot not found: ${depotId}`);
        }
        if (!isDepotAwaitingMasaRetour(lockedDepot)) {
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
        this.logger.log('Depot already transitioned while processing MASA return', { masaId, depotId });
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
