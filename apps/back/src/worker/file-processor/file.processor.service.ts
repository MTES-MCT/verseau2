import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { MemoryMonitorService } from '@shared/memory-monitor/memoryMonitor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { S3 } from '@s3/s3';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { XMLParser } from 'fast-xml-parser';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
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

    // TODO : Gérer la logique dans une transacation
    // ou persister à la fin de tous les contrôles
    await this.queueService.work<FichierDeDepot>(QueueName.process_file, async ([job]) => {
      const startTime = Date.now();
      const memoryBefore = this.memoryMonitor.getMemoryUsage();

      this.logger.log('Processing jobId', job.id);
      this.memoryMonitor.logMemoryUsage('Before processing', memoryBefore);

      this.logger.log('Downloading file', job.data.filePath);
      const downloadStartTime = Date.now();
      const file = await this.s3.download(job.data.filePath);
      const downloadDuration = Date.now() - downloadStartTime;

      this.logger.log('File downloaded', {
        duration: `${downloadDuration}ms`,
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });
      this.memoryMonitor.logMemoryUsage('After download', this.memoryMonitor.getMemoryUsage());

      const validationStartTime = Date.now();
      await this.controleSandreService.execute(file, job.data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const xmlObj: { FctAssain: { Scenario: { Emetteur: object } } } = new XMLParser().parse(file);
      this.logger.debug('xmlObj?.FctAssain?.Scenario?.Emetteur', xmlObj?.FctAssain?.Scenario?.Emetteur);
      const validationDuration = startTime - validationStartTime;

      this.logger.log('Validation completed', {
        duration: `${validationDuration}ms`,
      });
      this.memoryMonitor.logMemoryUsage('After validation', this.memoryMonitor.getMemoryUsage());

      return null;
    });
  }
}
