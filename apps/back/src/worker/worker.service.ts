import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CustomClsStore } from '@shared/logger/cls-store.interface';
import { QueueGateway, QueueName, QueueOptions } from '@queue/queue';
import type { DiffusionRapportJobData, EmailJobData, Queue } from '@queue/queue';
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
import { DepotUploadService } from '@dossier/depot/depotUpload.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly queueConfig: Record<QueueName, QueueOptions> = {
    [QueueName.process_file]: { batchSize: 1 },
    [QueueName.cleanup_depot_upload]: { batchSize: 1 },
    [QueueName.email]: { batchSize: 1 },
    [QueueName.send_to_sftp]: { batchSize: 1 },
    [QueueName.controle_metier]: { batchSize: 1 },
    [QueueName.controle_sandre_upload]: { batchSize: 1 },
    [QueueName.controle_sandre_poll]: { batchSize: 1 },
    [QueueName.process_after_masa_webhook]: { batchSize: 1 },
    [QueueName.diffusion_rapport]: { batchSize: 1 },
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
    private readonly depotUploadService: DepotUploadService,
  ) {
    this.logger.setContext(WorkerService.name);
  }

  async onModuleInit() {
    for (const queueName of Object.values(QueueName)) {
      const config = this.queueConfig[queueName];
      const options = config ? config : { batchSize: 1 };

      switch (queueName) {
        case QueueName.cleanup_depot_upload:
          await this.queueService.work<{ depotId: string }>(queueName, options, async ([job]) => {
            const context = { queueName, jobId: job.id, depotId: job.data.depotId };
            this.logger.log('Job processing started', context);
            try {
              await this.depotUploadService.cleanup(job.data.depotId);
              this.logger.log('Job processing completed', context);
            } catch (error: unknown) {
              this.logger.error('Job processing failed', { ...context, error });
              throw error;
            }
          });
          break;
        case QueueName.process_file:
          await this.queueService.work<FichierDeDepot & { correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
                const context = { queueName, jobId: job.id, depotId: job.data.depotId };
                this.logger.log('Job processing started', context);
                try {
                  const result = await this.fileProcessorService.process(job.data);
                  this.logger.log('Job processing completed', context);
                  return result;
                } catch (error: unknown) {
                  this.logger.error('Job processing failed', { ...context, error });
                  throw error; // Re-throw so pg-boss still marks it as failed for retry
                }
              });
            },
          );
          break;
        case QueueName.email:
          await this.queueService.work<EmailJobData & { correlationId?: string }>(queueName, options, async ([job]) => {
            return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
              const context = { queueName, jobId: job.id };
              this.logger.log('Job processing started', context);
              try {
                const result = await this.emailProvider.send(job.data.template, job.data.params);
                this.logger.log('Job processing completed', context);
                return result;
              } catch (error: unknown) {
                this.logger.error('Job processing failed', { ...context, error });
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
                const context = { queueName, jobId: job.id, depotId: job.data.depotId };
                this.logger.log('Job processing started', context);
                try {
                  const result = await this.sftpProcessorService.process(job.data);
                  this.logger.log('Job processing completed', context);
                  return result;
                } catch (error: unknown) {
                  this.logger.error('Job processing failed', { ...context, error });
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
                const context = { queueName, jobId: job.id, depotId: job.data.depotId };
                this.logger.log('Job processing started', context);
                try {
                  const result = await this.controleMetierProcessorService.process(job.data);
                  this.logger.log('Job processing completed', context);
                  return result;
                } catch (error: unknown) {
                  this.logger.error('Job processing failed', { ...context, error });
                  throw error; // Re-throw so pg-boss still marks it as failed for retry
                }
              });
            },
          );
          break;
        case QueueName.controle_sandre_upload:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            { ...options, includeMetadata: true },
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
                const context = { queueName, jobId: job.id, depotId: job.data.depotId };
                this.logger.log('Job processing started', context);
                try {
                  const result = await this.controleSandreUploadProcessorService.process({
                    ...job.data,
                    retryCount: job.retryCount,
                    retryLimit: job.retryLimit,
                  });
                  this.logger.log('Job processing completed', context);
                  return result;
                } catch (error: unknown) {
                  this.logger.error('Job processing failed', { ...context, error });
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
              const context = { queueName, jobId: job.id, depotId: job.data.depotId };
              this.logger.debug('Job processing started', context);
              try {
                const result = await this.controleSandrePollProcessorService.process(job.data);
                this.logger.debug('Job processing completed', context);
                return result;
              } catch (error: unknown) {
                this.logger.error('Job processing failed', { ...context, error });
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
                const context = { queueName, jobId: job.id, depotId: job.data.depotId };
                this.logger.log('Job processing started', context);
                try {
                  const result = await this.masaProcessorService.process(job.data);
                  this.logger.log('Job processing completed', context);
                  return result;
                } catch (error: unknown) {
                  this.logger.error('Job processing failed', { ...context, error });
                  throw error;
                }
              });
            },
          );
          break;
        case QueueName.diffusion_rapport:
          await this.queueService.work<DiffusionRapportJobData & { correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
                const context = { queueName, jobId: job.id, depotId: job.data.depotId };
                this.logger.log('Job processing started', context);
                try {
                  const result = await this.diffusionRapportProcessorService.process(job.data);
                  this.logger.log('Job processing completed', context);
                  return result;
                } catch (error: unknown) {
                  this.logger.error('Job processing failed', { ...context, error });
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
