import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueGateway, QueueName, QueueOptions } from '@queue/queue';
import type { EmailJobData, Queue } from '@queue/queue';
import { FileProcessorService } from './fileProcessor/fileProcessor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { LoggerService } from '@shared/logger/logger.service';
import { SftpAgentVerseauProcessorService } from './sftp/sftpAgentVerseauProcessor.service';
import { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import { ControleSandreProcessorService } from './controleSandre/controle-sandre.processor.service';
import { MasaWebhookProcessorService } from './masa/masaWebhookProcessor.service';
import { EmailProvider } from '@notification/email.provider';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly queueConfig: Record<QueueName, QueueOptions> = {
    [QueueName.process_file]: { batchSize: 5 },
    [QueueName.email]: { batchSize: 10 },
    [QueueName.send_to_sftp]: { batchSize: 5 },
    [QueueName.controle_metier]: { batchSize: 5 },
    [QueueName.controle_sandre]: { batchSize: 5 },
    [QueueName.process_after_masa_webhook]: { batchSize: 3 },
  };

  constructor(
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly fileProcessorService: FileProcessorService,
    private readonly sftpProcessorService: SftpAgentVerseauProcessorService,
    private readonly controleMetierProcessorService: ControleMetierProcessorService,
    private readonly controleSandreProcessorService: ControleSandreProcessorService,
    private readonly masaProcessorService: MasaWebhookProcessorService,
    @Inject(EmailProvider) private readonly emailProvider: EmailProvider,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WorkerService.name);
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
          await this.queueService.work<EmailJobData>(queueName, options, async ([job]) => {
            this.logger.log('Processing email jobId', job.id);
            try {
              return await this.emailProvider.send(job.data.template, job.data.params);
            } catch (error) {
              this.logger.error('Email job processing failed', {
                jobId: job.id,
                error: error instanceof Error ? error.message : (error as string),
              });
              throw error;
            }
          });
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
        case QueueName.controle_metier:
          await this.queueService.work<{ depotId: string; filePath: string }>(queueName, options, async ([job]) => {
            this.logger.log('Processing jobId', job.id);
            try {
              return await this.controleMetierProcessorService.process(job.data);
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
        case QueueName.process_after_masa_webhook:
          await this.queueService.work<{ masaId: string; depotId: string }>(queueName, options, async ([job]) => {
            this.logger.log('Processing after MASA webhook jobId', job.id);
            try {
              return await this.masaProcessorService.process(job.data);
            } catch (error) {
              this.logger.error('After MASA webhook processing failed', {
                jobId: job.id,
                error: error instanceof Error ? error.message : (error as string),
                stack: error instanceof Error ? error.stack : undefined,
              });
              throw error;
            }
          });
          break;
        default:
          break;
      }
    }
  }
}
