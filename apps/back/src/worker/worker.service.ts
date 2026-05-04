import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CustomClsStore } from '@shared/logger/cls-store.interface';
import { QueueGateway, QueueName, QueueOptions } from '@queue/queue';
import type { EmailJobData, Queue } from '@queue/queue';
import { FileProcessorService } from './fileProcessor/fileProcessor.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { LoggerService } from '@shared/logger/logger.service';
import { SftpAgentVerseauProcessorService } from './sftp/sftpAgentVerseauProcessor.service';
import { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import { ControleSandreUploadProcessorService } from './controleSandre/controle-sandre-upload.processor.service';
import { ControleSandrePollProcessorService } from './controleSandre/controle-sandre-poll.processor.service';
import { DiffusionRapportProcessorService } from './diffusionRapport/diffusionRapportProcessor.service';
import { MasaWebhookProcessorService } from './masa/masaWebhookProcessor.service';
import { EmailProvider } from '@notification/email.provider';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly queueConfig: Record<QueueName, QueueOptions> = {
    [QueueName.process_file]: { batchSize: 5 },
    [QueueName.email]: { batchSize: 10 },
    [QueueName.send_to_sftp]: { batchSize: 5 },
    [QueueName.controle_metier]: { batchSize: 5 },
    [QueueName.controle_sandre_upload]: { batchSize: 1 },
    [QueueName.controle_sandre_poll]: { batchSize: 1 },
    [QueueName.process_after_masa_webhook]: { batchSize: 3 },
    [QueueName.diffusion_rapport]: { batchSize: 3 },
  };

  constructor(
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly fileProcessorService: FileProcessorService,
    private readonly sftpProcessorService: SftpAgentVerseauProcessorService,
    private readonly controleMetierProcessorService: ControleMetierProcessorService,
    private readonly controleSandreUploadProcessorService: ControleSandreUploadProcessorService,
    private readonly controleSandrePollProcessorService: ControleSandrePollProcessorService,
    private readonly masaProcessorService: MasaWebhookProcessorService,
    private readonly diffusionRapportProcessorService: DiffusionRapportProcessorService,
    @Inject(EmailProvider) private readonly emailProvider: EmailProvider,
    private readonly cls: ClsService<CustomClsStore>,
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
          await this.queueService.work<FichierDeDepot & { correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
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
            },
          );
          break;
        case QueueName.email:
          await this.queueService.work<EmailJobData & { correlationId?: string }>(queueName, options, async ([job]) => {
            return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
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
          });
          break;
        case QueueName.send_to_sftp:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
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
            },
          );
          break;
        case QueueName.controle_metier:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
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
            },
          );
          break;
        case QueueName.controle_sandre_upload:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
                this.logger.log('Processing SANDRE upload jobId', job.id);
                try {
                  return await this.controleSandreUploadProcessorService.process(job.data);
                } catch (error) {
                  this.logger.error('SANDRE upload job processing failed', {
                    jobId: job.id,
                    error: error instanceof Error ? error.message : (error as string),
                    stack: error instanceof Error ? error.stack : undefined,
                  });
                  throw error; // Re-throw so pg-boss still marks it as failed for retry
                }
              });
            },
          );
          break;
        case QueueName.controle_sandre_poll:
          await this.queueService.work<{
            depotId: string;
            jeton: string;
            attemptCount: number;
            correlationId?: string;
          }>(queueName, options, async ([job]) => {
            return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
              this.logger.log('Processing SANDRE poll jobId', job.id);
              try {
                return await this.controleSandrePollProcessorService.process(job.data);
              } catch (error) {
                this.logger.error('SANDRE poll job processing failed', {
                  jobId: job.id,
                  error: error instanceof Error ? error.message : (error as string),
                  stack: error instanceof Error ? error.stack : undefined,
                });
                throw error; // Re-throw so pg-boss still marks it as failed for retry
              }
            });
          });
          break;
        case QueueName.process_after_masa_webhook:
          await this.queueService.work<{ masaId: string; depotId: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
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
            },
          );
          break;
        case QueueName.diffusion_rapport:
          await this.queueService.work<{ depotId: string; masaId?: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
                this.logger.log('Processing diffusion rapport jobId', job.id);
                try {
                  return await this.diffusionRapportProcessorService.process(job.data);
                } catch (error) {
                  this.logger.error('Diffusion rapport processing failed', {
                    jobId: job.id,
                    error: error instanceof Error ? error.message : (error as string),
                    stack: error instanceof Error ? error.stack : undefined,
                  });
                  throw error;
                }
              });
            },
          );
          break;
        default:
          break;
      }
    }
  }
}
