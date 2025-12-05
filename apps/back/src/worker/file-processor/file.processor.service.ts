import { Inject, Injectable } from '@nestjs/common';

import { LoggerService } from '@shared/logger/logger.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { S3 } from '@s3/s3';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { AsyncTask } from '@worker/asyncTask';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { AcceptationStatus } from '@dossier/controle/technique/sandre/sandre';

@Injectable()
export class FileProcessorService implements AsyncTask<FichierDeDepot> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
    private readonly controleV1Service: ControleV1Service,
    private readonly queueService: QueueService,
    private readonly depotService: DepotService,
  ) {}
  private readonly logger = new LoggerService(FileProcessorService.name);

  async process(fichierDeDepot: FichierDeDepot) {
    await this.depotService.update(fichierDeDepot.depotId, {
      status: DepotStatus.PROCESSING,
      step: DepotStep.CONTROLE_IN_PROGRESS,
    });

    try {
      this.logger.log('Downloading file', fichierDeDepot.filePath);
      const file = await this.s3.download(fichierDeDepot.filePath);

      this.logger.log('File downloaded', {
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });

      // Controle SANDRE
      const sandreControle = await this.controleSandreService.execute(file, fichierDeDepot);
      if (sandreControle?.acceptationStatus === AcceptationStatus.NON_CONFORMANT) {
        await this.depotService.update(fichierDeDepot.depotId, {
          status: DepotStatus.FAILED,
          step: DepotStep.PARSER_SANDRE_FAILED,
        });
        return;
      }

      const xmlObj = await parseScenarioAssainissementXml(file.toString());

      // Controle V1
      const controles = await this.controleV1Service.execute(fichierDeDepot.depotId, xmlObj);

      //TODO : Voir les cas d'erreur bloquante
      // const hasFailedControle = controles.some((controle) => controle.success === false);
      // if (hasFailedControle) {
      //   await this.depotService.update(fichierDeDepot.depotId, {
      //     status: DepotStatus.FAILED,
      //     state: DepotState.CONTROLE_FAILED,
      //   });
      //   return;
      // }

      await this.depotService.update(fichierDeDepot.depotId, {
        status: DepotStatus.PROCESSING,
        step: DepotStep.READY_FOR_SFTP,
      });

      await this.queueService.send(QueueName.send_to_sftp, {
        depotId: fichierDeDepot.depotId,
        filePath: fichierDeDepot.filePath,
      });
    } catch (error) {
      await this.depotService.update(fichierDeDepot.depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_FAILED,
      });
      throw error;
    }
  }
}
