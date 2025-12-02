import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { LoggerService } from '@shared/logger/logger.service';
import { MemoryMonitorService } from '@shared/memory-monitor/memoryMonitor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { S3 } from '@s3/s3';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { AsyncTask } from '@worker/asyncTask';
import { parseScenarioAssainissementXml } from '@lib/parser';

@Injectable()
export class FileProcessorService implements OnModuleInit, AsyncTask<FichierDeDepot> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
    private readonly memoryMonitor: MemoryMonitorService,
    @Inject(LanceleauGateway)
    private readonly lanceleauGateway: LanceleauGateway,
  ) {}
  private readonly logger = new LoggerService(FileProcessorService.name);

  async onModuleInit() {
    // TODO : supprimer après test
    const res = await this.lanceleauGateway.findItvById('6');
    console.log('this.lanceleauGateway.findItvById(6): ', res);
    this.memoryMonitor.logMemoryUsage('Service initialized', this.memoryMonitor.getMemoryUsage());
  }

  async process(fichierDeDepot: FichierDeDepot) {
    // TODO : Gérer la logique dans une transacation
    // ou persister à la fin de tous les contrôles
    const startTime = Date.now();
    const memoryBefore = this.memoryMonitor.getMemoryUsage();

    this.memoryMonitor.logMemoryUsage('Before processing', memoryBefore);

    this.logger.log('Downloading file', fichierDeDepot.filePath);
    const downloadStartTime = Date.now();
    const file = await this.s3.download(fichierDeDepot.filePath);
    const downloadDuration = Date.now() - downloadStartTime;

    this.logger.log('File downloaded', {
      duration: `${downloadDuration}ms`,
      fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
    });
    this.memoryMonitor.logMemoryUsage('After download', this.memoryMonitor.getMemoryUsage());

    const validationStartTime = Date.now();
    await this.controleSandreService.execute(file, fichierDeDepot);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const xmlObj = await parseScenarioAssainissementXml(file.toString());
    this.logger.debug('xmlObj?.scenario?.emetteur', xmlObj?.scenario?.emetteur);
    const validationDuration = startTime - validationStartTime;

    this.logger.log('Validation completed', {
      duration: `${validationDuration}ms`,
    });
    this.memoryMonitor.logMemoryUsage('After validation', this.memoryMonitor.getMemoryUsage());
  }
}
