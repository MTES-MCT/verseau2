import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CustomClsStore } from '@shared/logger/cls-store.interface';
import { MemoryMonitorService } from '@shared/memory-monitor/memoryMonitor.service';
import { QueueGateway, QueueName, QueueOptions } from '@queue/queue';
import type { DiffusionRapportJobData, EmailJobData, Queue, QueueJob } from '@queue/queue';
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
    private readonly memoryMonitorService: MemoryMonitorService,
  ) {
    this.logger.setContext(WorkerService.name);
  }

  /**
   * Logs memory usage at the job boundaries so that memory drift (e.g. from a
   * hostile depot file) is observable on the single worker process. Every
   * queue is consumed with batchSize: 1, so a batch holds a single job.
   */
  private trackMemoryOnJobs<TData>(handler: (jobs: QueueJob<TData>[]) => Promise<unknown>) {
    return async (jobs: QueueJob<TData>[]): Promise<unknown> => {
      const jobId = jobs[0]?.id ?? 'unknown';
      this.memoryMonitorService.logMemoryUsage(`job ${jobId} start`, this.memoryMonitorService.getMemoryUsage());
      try {
        return await handler(jobs);
      } finally {
        this.memoryMonitorService.logMemoryUsage(`job ${jobId} end`, this.memoryMonitorService.getMemoryUsage());
      }
    };
  }

  async onModuleInit() {
    for (const queueName of Object.values(QueueName)) {
      const config = this.queueConfig[queueName];
      const options = config ? config : { batchSize: 1 };

      switch (queueName) {
        case QueueName.cleanup_depot_upload:
          await this.queueService.work<{ depotId: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
              await this.depotUploadService.cleanup(job.data.depotId);
            }),
          );
          break;
        case QueueName.process_file:
          await this.queueService.work<FichierDeDepot & { correlationId?: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        case QueueName.email:
          await this.queueService.work<EmailJobData & { correlationId?: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        case QueueName.send_to_sftp:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        case QueueName.controle_metier:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        case QueueName.controle_sandre_upload:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            { ...options, includeMetadata: true },
            this.trackMemoryOnJobs(async ([job]) => {
              return await this.cls.runWith({ correlationId: job.data.correlationId }, async () => {
                this.logger.log('Processing SANDRE upload jobId', job.id);
                try {
                  return await this.controleSandreUploadProcessorService.process({
                    ...job.data,
                    retryCount: job.retryCount,
                    retryLimit: job.retryLimit,
                  });
                } catch (error) {
                  this.logger.error('SANDRE upload job processing failed', {
                    jobId: job.id,
                    error: error instanceof Error ? error.message : (error as string),
                    stack: error instanceof Error ? error.stack : undefined,
                  });
                  throw error; // Re-throw so pg-boss still marks it as failed for retry
                }
              });
            }),
          );
          break;
        case QueueName.controle_sandre_poll:
          await this.queueService.work<{
            depotId: string;
            jeton: string;
            attemptCount: number;
            correlationId?: string;
          }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        case QueueName.process_after_masa_webhook:
          await this.queueService.work<{ masaId: string; depotId: string; correlationId?: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        case QueueName.diffusion_rapport:
          await this.queueService.work<DiffusionRapportJobData & { correlationId?: string }>(
            queueName,
            options,
            this.trackMemoryOnJobs(async ([job]) => {
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
            }),
          );
          break;
        default:
          break;
      }
    }
  }
}
