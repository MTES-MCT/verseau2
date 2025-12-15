import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueGateway, QueueName, QueueOptions } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { FileProcessorService } from './fileProcessor/fileProcessor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { LoggerService } from '@shared/logger/logger.service';
import { SftpProcessorService } from './sftp/sftpProcessor.service';
import { ControleV1ProcessorService } from './controleV1/controleV1Processor.service';
import { ControleSandreProcessorService } from './controleSandre/controle-sandre.processor.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly queueConfig: Record<QueueName, QueueOptions> = {
    [QueueName.process_file]: { batchSize: 5 },
    [QueueName.email]: { batchSize: 10 },
    [QueueName.send_to_sftp]: { batchSize: 5 },
    [QueueName.controle_v1]: { batchSize: 5 },
    [QueueName.controle_sandre]: { batchSize: 5 },
  };

  constructor(
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly fileProcessorService: FileProcessorService,
    private readonly sftpProcessorService: SftpProcessorService,
    private readonly controleV1ProcessorService: ControleV1ProcessorService,
    private readonly controleSandreProcessorService: ControleSandreProcessorService,
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
        case QueueName.send_to_sftp:
          await this.queueService.work<{ depotId: string; filePath: string }>(queueName, options, async ([job]) => {
            this.logger.log('Processing jobId', job.id);
            try {
              return await this.sftpProcessorService.process(job.data);
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
        case QueueName.controle_v1:
          await this.queueService.work<{ depotId: string; filePath: string }>(queueName, options, async ([job]) => {
            this.logger.log('Processing jobId', job.id);
            try {
              return await this.controleV1ProcessorService.process(job.data);
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
        case QueueName.controle_sandre:
          await this.queueService.work<{ depotId: string; filePath: string }>(queueName, options, async ([job]) => {
            this.logger.log('Processing jobId', job.id);
            try {
              return await this.controleSandreProcessorService.process(job.data);
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
        default:
          break;
      }
    }
  }
}
