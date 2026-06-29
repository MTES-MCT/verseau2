import { Injectable, Inject } from '@nestjs/common';
import { DepotService } from './depot.service';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { DiffusionRapportJobData, Queue } from '@queue/queue';
import { DepotStep, DepotStatus, EtapeMetier, ControleStatus, ControleSandreStatus } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';

/**
 * Ce service a pour rôle d'orchestrer la suite du traitement d'un dépôt une fois les contrôles terminés.
 * Étant donné que les contrôles métier (V1/V2) et les contrôles SANDRE s'exécutent de manière asynchrone et en parallèle,
 * ce coordinateur vérifie si les deux flux sont achevés.
 * - Si les deux contrôles réussissent, il déclenche l'envoi vers le SFTP de du MASA.
 * - Si l'un des deux échoue (erreur métier, erreur SANDRE), il passe le dépôt en statut REJETE et déclenche l'envoi du rapport d'erreur au déposant uniquement. Les erreurs techniques ne déclenchent pas de rapport.
 */
@Injectable()
export class DepotCoordinatorService {
  private readonly logger = new LoggerService(DepotCoordinatorService.name);

  constructor(
    private readonly depotService: DepotService,
    @Inject(QueueGateway) private readonly queueService: Queue,
  ) {}

  async checkControlesCompletion(depotId: string): Promise<void> {
    const depot = await this.depotService.findById(depotId);

    if (
      depot.status === DepotStatus.INTEGRE ||
      depot.status === DepotStatus.INTEGRE_PARTIELLEMENT ||
      depot.status === DepotStatus.REJETE ||
      depot.step === DepotStep.READY_FOR_SFTP ||
      depot.step === DepotStep.SFTP_IN_PROGRESS ||
      depot.step === DepotStep.SFTP_COMPLETED
    ) {
      this.logger.log(`Depot ${depotId} - Already in terminal state or SFTP dispatched`, {
        status: depot.status,
        step: depot.step,
      });
      return;
    }

    const v1V2Complete: boolean = Boolean(depot.controleStatus && depot.controleStatus !== ControleStatus.PENDING);
    const sandreComplete: boolean = Boolean(
      depot.controleSandreStatus && depot.controleSandreStatus !== ControleSandreStatus.PENDING,
    );

    if (!v1V2Complete || !sandreComplete) {
      this.logger.log(`Depot ${depotId} - Controls not yet complete`, {
        controleV1V2Status: depot.controleStatus ?? null,
        controleSandreStatus: depot.controleSandreStatus ?? null,
      });
      return;
    }

    const v1V2Success: boolean = depot.controleStatus === ControleStatus.SUCCESS;
    const sandreSuccess: boolean = depot.controleSandreStatus === ControleSandreStatus.SUCCESS;

    if (v1V2Success && sandreSuccess) {
      this.logger.log(`Depot ${depotId} - Both controls succeeded, dispatching to SFTP`);
      await this.depotService.update(depotId, {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.READY_FOR_SFTP,
        etapeMetier: EtapeMetier.FINALISATION_IMPORT,
      });

      await this.queueService.send(QueueName.send_to_sftp, {
        depotId: depot.id,
        filePath: depot.path ?? '',
      });
    } else {
      const failedStep: DepotStep = !v1V2Success ? DepotStep.CONTROLE_FAILED : DepotStep.CONTROLE_SANDRE_FAILED;

      this.logger.error(`Depot ${depotId} - Control failed`, {
        controleV1Status: depot.controleStatus ?? null,
        controleSandreStatus: depot.controleSandreStatus ?? null,
        failedStep,
      });

      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: failedStep,
      });

      if (!depot.error) {
        await this.queueService.send<DiffusionRapportJobData>(QueueName.diffusion_rapport, {
          depotId,
          destinataires: [RapportDestinataire.DEPOSANT],
        });
      } else {
        this.logger.log(`Depot ${depotId} - Technical error detected, skipping diffusion_rapport`, {
          error: depot.error,
        });
      }
    }
  }
}
