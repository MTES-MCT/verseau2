import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { FichierDeDepot } from '@depot/depot/file/file';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {
    this.logger.log('FileProcessorService with custom logger', { a: 1 }, 'un autre message', [{ b: 2 }, { c: 3 }]);
  }
  private readonly logger = new LoggerService(FileProcessorService.name);

  async onModuleInit() {
    await this.queueService.work<FichierDeDepot>(QueueName.process_file, async ([job]) => {
      this.logger.log('Processing jobId', job.id);
      this.logger.log('Processing filename', job.data.filename);
      this.logger.log('Processing mimetype', job.data.mimetype);
      this.logger.log('Processing size', job.data.size);
      return Promise.resolve()
        .then(() => {
          this.logger.log('Processing file completed');
        })
        .catch((error) => {
          this.logger.error('Processing file failed', error);
        });
    });
  }
}
