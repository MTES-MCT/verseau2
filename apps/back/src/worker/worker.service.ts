import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@queue/queue.service';
import { QueueName, QueueOptions } from '@queue/queue';
import { FileProcessorService } from './file-processor/file.processor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly queueConfig: Record<QueueName, QueueOptions> = {
    [QueueName.process_file]: { batchSize: 1 },
    [QueueName.email]: { batchSize: 10 },
  };

  constructor(
    private readonly queueService: QueueService,
    private readonly fileProcessorService: FileProcessorService,
    private readonly logger: LoggerService,
  ) {
    this.logger = new LoggerService(WorkerService.name);
  }

  async onModuleInit() {
    for (const queueName of Object.values(QueueName)) {
      const config = this.queueConfig[queueName];
      const options = config ? config : { batchSize: 1 };

      switch (queueName) {
        case QueueName.process_file:
          await this.queueService.work<FichierDeDepot>(queueName, options, async ([job]) => {
            this.logger.log('Processing jobId', job.id);
            try {
              return await this.fileProcessorService.process(job.data);
            } catch (error) {
              this.logger.error('Job processing failed', {
                jobId: job.id,
                error: error instanceof Error ? error.message : (error as string),
                stack: error instanceof Error ? error.stack : undefined,
              });
              throw error; // Re-throw so pg-boss still marks it as failed for retry
            }
          });
          break;
        case QueueName.email:
          // TODO: Implement email worker
          break;
        default:
          break;
      }
    }
  }
}
