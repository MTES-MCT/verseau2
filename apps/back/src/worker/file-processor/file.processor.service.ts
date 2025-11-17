import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { MemoryMonitorService } from '@shared/memory-monitor/memoryMonitor.service';
import { FichierDeDepot } from '@depot/depot/file/file';
import { S3 } from '@s3/s3';
import { ControleSandreService } from './controleSandre';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
    private readonly memoryMonitor: MemoryMonitorService,
  ) {
    this.logger.log('FileProcessorService with custom logger', { a: 1 }, 'un autre message', [{ b: 2 }, { c: 3 }]);
  }
  private readonly logger = new LoggerService(FileProcessorService.name);

  async onModuleInit() {
    // Log initial memory state
    this.memoryMonitor.logMemoryUsage('Service initialized', this.memoryMonitor.getMemoryUsage());

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
      const validationSummary = await this.controleSandreService.execute(file, job.data);
      //
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const xmlObj: { FctAssain: { Scenario: { Emetteur: object } } } = new XMLParser().parse(
        Buffer.from(file.toString('utf-8'), 'base64').toString('utf-8'),
      );
      this.logger.log('!!!!!!!!! xmlObj?.FctAssain?.Scenario?.Emetteur', xmlObj?.FctAssain?.Scenario?.Emetteur);
      const validationDuration = startTime - validationStartTime;

      this.logger.log('Validation completed', {
        duration: `${validationDuration}ms`,
      });
      this.memoryMonitor.logMemoryUsage('After validation', this.memoryMonitor.getMemoryUsage());

      return validationSummary;
    });
  }
}
