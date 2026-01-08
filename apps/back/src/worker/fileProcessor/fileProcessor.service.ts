import { Injectable, Inject } from '@nestjs/common';

import { LoggerService } from '@shared/logger/logger.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, EtapeMetier, ControleSandreStatus, ControleStatus } from '@lib/dossier';
import { AsyncTask } from '@worker/asyncTask';

@Injectable()
export class FileProcessorService implements AsyncTask<FichierDeDepot> {
  constructor(
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly depotService: DepotService,
  ) {}
  private readonly logger = new LoggerService(FileProcessorService.name);

  async process(fichierDeDepot: FichierDeDepot) {
    await this.depotService.update(fichierDeDepot.depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.CONTROLE_IN_PROGRESS,
      etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
      controleStatus: ControleStatus.PENDING,
      controleSandreStatus: ControleSandreStatus.PENDING,
    });

    try {
      this.logger.log(`Depot ${fichierDeDepot.depotId} - Dispatching controls to queues`);

      // Dispatch to both control queues
      await Promise.all([
        this.queueService.send(QueueName.controle_metier, {
          depotId: fichierDeDepot.depotId,
          filePath: fichierDeDepot.filePath,
        }),
        this.queueService.send(QueueName.controle_sandre, {
          depotId: fichierDeDepot.depotId,
          filePath: fichierDeDepot.filePath,
        }),
      ]);

      this.logger.log(`Depot ${fichierDeDepot.depotId} - Controls dispatched successfully`);
    } catch (error: unknown) {
      await this.depotService.update(fichierDeDepot.depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
      });
      throw error;
    }
  }
}
