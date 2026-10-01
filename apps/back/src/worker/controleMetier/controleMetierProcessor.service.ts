import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from '@s3/s3';
import { AsyncTask } from '@worker/asyncTask';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { ControleMetierV2Service } from '@dossier/controle/metierv2/controleMetierV2.service';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { DepotService } from '@dossier/depot/depot.service';
import {
  DepotStep,
  DepotStatus,
  EtapeMetier,
  ControleStatus,
  EvenementType,
  ControleName,
  ControleType,
  ErrorCode,
} from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { DiffusionRapportJobData, Queue } from '@queue/queue';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { DataSource } from 'typeorm';

@Injectable()
export class ControleMetierProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly dataSource: DataSource,
    private readonly controleMetierV2Service: ControleMetierV2Service,
    private readonly controleV1Service: ControleV1Service,
    private readonly depotService: DepotService,
    @Inject(QueueGateway) private readonly queueService: Queue,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ControleMetierProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.CONTROLE_IN_PROGRESS,
    });

    let followUp: () => Promise<void>;

    try {
      this.logger.log(`Depot ${depotId} - Downloading file for Business controls (V1 & V2)`, filePath);
      const file = await this.s3.download(filePath);
      this.logger.log(`Depot ${depotId} - File downloaded for Business controls`, {
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });

      const xmlObj = await parseScenarioAssainissementXml(file.toString());

      this.logger.log(`Depot ${depotId} - Controles Métier (V1 & V2) en cours (Transactional)`);

      // No stable transactional decorator library found
      // For the moment, we use the DataSource transaction method
      const { allSuccess, resultsV1, resultsV2 } = await this.dataSource.transaction(async (manager) => {
        const resultsV1 = await this.controleV1Service.execute(depotId, xmlObj, manager);
        const resultsV2 = await this.controleMetierV2Service.execute(depotId, xmlObj, manager);

        const allSuccess = [...resultsV1, ...resultsV2].every(
          (controle) => controle.evenementType !== EvenementType.ERREUR,
        );

        return { allSuccess, resultsV1, resultsV2 };
      });

      this.logger.log(`Depot ${depotId} - Controles Métier result`, {
        success: allSuccess,
        v1Count: resultsV1.length,
        v2Count: resultsV2.length,
      });

      if (allSuccess) {
        await this.depotService.update(depotId, {
          controleStatus: ControleStatus.SUCCESS,
          step: DepotStep.CONTROLE_COMPLETED,
          etapeMetier: EtapeMetier.CONTROLE_METIER,
        });

        // Sequential processing: SANDRE control starts only after business controls succeed
        followUp = async () => {
          this.logger.log(`Depot ${depotId} - Business controls succeeded, dispatching SANDRE control`);
          await this.queueService.send(QueueName.controle_sandre_upload, {
            depotId,
            filePath,
          });
        };
      } else {
        this.logger.log(`Depot ${depotId} - Business controls failed, rejecting depot`);

        await this.depotService.update(depotId, {
          status: DepotStatus.REJETE,
          controleStatus: ControleStatus.FAILED,
          step: DepotStep.CONTROLE_FAILED,
          etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
        });

        followUp = async () => {
          await this.queueService.send<DiffusionRapportJobData>(QueueName.diffusion_rapport, {
            depotId,
            destinataires: [RapportDestinataire.DEPOSANT],
          });
        };
      }
    } catch (error) {
      this.logger.error(`Depot ${depotId} - Controles Métier failed`, error);

      try {
        await this.createTechnicalErrorControle(depotId);
        this.logger.log(`Depot ${depotId} - Technical error control persisted successfully`);
      } catch (persistError) {
        this.logger.error(`Depot ${depotId} - Failed to persist technical error control`, persistError);
      }

      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
        controleStatus: ControleStatus.FAILED,
        error: DepotError.CONTROLE_METIER_TECHNICAL_FAILURE,
      });

      return;
    }

    await followUp();
  }

  private async createTechnicalErrorControle(depotId: string): Promise<void> {
    await this.controleGateway.createControle({
      name: ControleName.CTL_TECHNICAL_ERROR,
      type: ControleType.CONTROLE_V2,
      success: false,
      evenementType: EvenementType.ERREUR,
      error: ErrorCode.E2_999,
      errorParams: [depotId],
      depotId,
    });
  }
}
