import { Inject, Injectable } from '@nestjs/common';

import { LoggerService } from '@shared/logger/logger.service';
import { MemoryMonitorService } from '@shared/memory-monitor/memoryMonitor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { S3 } from '@s3/s3';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { AsyncTask } from '@worker/asyncTask';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { ControleIndividuel } from '@lib/controle';

@Injectable()
export class FileProcessorService implements AsyncTask<FichierDeDepot> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
    private readonly memoryMonitor: MemoryMonitorService,
    private readonly controleV1Service: ControleV1Service,
  ) {}
  private readonly logger = new LoggerService(FileProcessorService.name);

  async process(fichierDeDepot: FichierDeDepot) {
    // TODO : Gérer la logique dans une transacation
    // ou persister à la fin de tous les contrôles
    const startTime = Date.now();

    this.logger.log('Downloading file', fichierDeDepot.filePath);
    const file = await this.s3.download(fichierDeDepot.filePath);

    this.logger.log('File downloaded', {
      fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
    });

    // await this.controleSandreService.execute(file, fichierDeDepot);

    const xmlObj = await parseScenarioAssainissementXml(file.toString());
    // Controle V1

    const validationResult: ControleIndividuel[] = await this.controleV1Service.execute(fichierDeDepot.depotId, xmlObj);
    console.log('validationResult', validationResult);
    if (!validationResult.every((controle) => controle.success)) {
      this.logger.log(`Validation failed for depot: ${fichierDeDepot.depotId}`, {
        errors: validationResult.flatMap((controle) => controle.errors),
      });
    } else {
      this.logger.log(`Validation succeeded for depot: ${fichierDeDepot.depotId}`);
    }
  }
}
