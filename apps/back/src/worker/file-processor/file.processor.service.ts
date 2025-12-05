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

@Injectable()
export class FileProcessorService implements AsyncTask<FichierDeDepot> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
    private readonly controleV1Service: ControleV1Service,
    private readonly queueService: QueueService,
  ) {}
  private readonly logger = new LoggerService(FileProcessorService.name);

  async process(fichierDeDepot: FichierDeDepot) {
    // TODO : Gérer la logique dans une transacation
    // ou persister à la fin de tous les contrôles

    this.logger.log('Downloading file', fichierDeDepot.filePath);
    const file = await this.s3.download(fichierDeDepot.filePath);

    this.logger.log('File downloaded', {
      fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
    });

    // Controle SANDRE
    // await this.controleSandreService.execute(file, fichierDeDepot);

    const xmlObj = await parseScenarioAssainissementXml(file.toString());

    // Controle V1
    await this.controleV1Service.execute(fichierDeDepot.depotId, xmlObj);

    await this.queueService.send(QueueName.send_to_sftp, {
      depotId: fichierDeDepot.depotId,
      filePath: fichierDeDepot.filePath,
    });
  }
}
