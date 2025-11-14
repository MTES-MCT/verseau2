import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { FichierDeDepot } from '@depot/depot/file/file';
import { S3 } from '@s3/s3';
import { ControleSandreService } from './controleSandre';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
  ) {
    this.logger.log('FileProcessorService with custom logger', { a: 1 }, 'un autre message', [{ b: 2 }, { c: 3 }]);
  }
  private readonly logger = new LoggerService(FileProcessorService.name);

  async onModuleInit() {
    await this.queueService.work<FichierDeDepot>(QueueName.process_file, async ([job]) => {
      this.logger.log('Processing jobId', job.id);
      this.logger.log('Downloading file', job.data.filePath);
      const file = await this.s3.download(job.data.filePath);

      const validationSummary = await this.controleSandreService.execute(file, job.data);
      return validationSummary;
    });
  }
}
