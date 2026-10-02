import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { ClsService } from 'nestjs-cls';
import type { CustomClsStore, JobLogContext } from '@shared/logger/cls-store.interface';
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
  ) {
    this.logger.setContext(WorkerService.name);
  }

  async onModuleInit() {
    for (const queueName of Object.values(QueueName)) {
      const config = this.queueConfig[queueName];
      const options = { ...(config ?? { batchSize: 1 }), includeMetadata: true };

      switch (queueName) {
        case QueueName.cleanup_depot_upload:
          await this.queueService.work<{ depotId: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    await this.depotUploadService.cleanup(job.data.depotId);
                    this.logJobCompleted(context, startedAt);
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error;
                  }
                },
              );
            },
          );
          break;
        case QueueName.process_file:
          await this.queueService.work<FichierDeDepot & { correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    const result = await this.fileProcessorService.process(job.data);
                    this.logJobCompleted(context, startedAt);
                    return result;
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error; // Re-throw so pg-boss still marks it as failed for retry
                  }
                },
              );
            },
          );
          break;
        case QueueName.email:
          await this.queueService.work<EmailJobData & { correlationId?: string }>(queueName, options, async ([job]) => {
            const depotId =
              job.data.params && 'depotId' in job.data.params && typeof job.data.params.depotId === 'string'
                ? job.data.params.depotId
                : undefined;
            const context = this.createJobContext(queueName, job, { depotId, template: job.data.template });
            return await this.cls.runWith({ correlationId: job.data.correlationId, jobContext: context }, async () => {
              const startedAt = this.logJobStarted(context);
              try {
                const result = await this.emailProvider.send(job.data.template, job.data.params);
                this.logJobCompleted(context, startedAt);
                return result;
              } catch (error: unknown) {
                this.logJobFailed(context, startedAt, error);
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
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    const result = await this.sftpProcessorService.process(job.data);
                    this.logJobCompleted(context, startedAt);
                    return result;
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error; // Re-throw so pg-boss still marks it as failed for retry
                  }
                },
              );
            },
          );
          break;
        case QueueName.controle_metier:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    const result = await this.controleMetierProcessorService.process(job.data);
                    this.logJobCompleted(context, startedAt);
                    return result;
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error; // Re-throw so pg-boss still marks it as failed for retry
                  }
                },
              );
            },
          );
          break;
        case QueueName.controle_sandre_upload:
          await this.queueService.work<{ depotId: string; filePath: string; correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    const result = await this.controleSandreUploadProcessorService.process({
                      ...job.data,
                      retryCount: job.retryCount,
                      retryLimit: job.retryLimit,
                    });
                    this.logJobCompleted(context, startedAt);
                    return result;
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error; // Re-throw so pg-boss still marks it as failed for retry
                  }
                },
              );
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
            const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
            return await this.cls.runWith({ correlationId: job.data.correlationId, jobContext: context }, async () => {
              const startedAt = this.logJobStarted(context, 'debug');
              try {
                const result = await this.controleSandrePollProcessorService.process(job.data);
                this.logJobCompleted(context, startedAt, 'debug');
                return result;
              } catch (error: unknown) {
                this.logJobFailed(context, startedAt, error);
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
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    const result = await this.masaProcessorService.process(job.data);
                    this.logJobCompleted(context, startedAt);
                    return result;
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error;
                  }
                },
              );
            },
          );
          break;
        case QueueName.diffusion_rapport:
          await this.queueService.work<DiffusionRapportJobData & { correlationId?: string }>(
            queueName,
            options,
            async ([job]) => {
              const context = this.createJobContext(queueName, job, { depotId: job.data.depotId });
              return await this.cls.runWith(
                { correlationId: job.data.correlationId, jobContext: context },
                async () => {
                  const startedAt = this.logJobStarted(context);
                  try {
                    const result = await this.diffusionRapportProcessorService.process(job.data);
                    this.logJobCompleted(context, startedAt);
                    return result;
                  } catch (error: unknown) {
                    this.logJobFailed(context, startedAt, error);
                    throw error;
                  }
                },
              );
            },
          );
          break;
        default:
          break;
      }
    }
  }

  private createJobContext(
    queueName: QueueName,
    job: QueueJob<unknown>,
    metadata: Pick<JobLogContext, 'depotId' | 'template'>,
  ): JobLogContext {
    return {
      queueName,
      jobId: job.id,
      ...(metadata.depotId === undefined ? {} : { depotId: metadata.depotId }),
      ...(metadata.template === undefined ? {} : { template: metadata.template }),
      ...(job.retryCount === undefined ? {} : { retryCount: job.retryCount, attempt: job.retryCount + 1 }),
      ...(job.retryLimit === undefined ? {} : { retryLimit: job.retryLimit }),
    };
  }

  private logJobStarted(context: JobLogContext, level: 'log' | 'debug' = 'log'): number {
    const startedAt = performance.now();
    this.logger[level]('Job processing started', context);
    return startedAt;
  }

  private logJobCompleted(context: JobLogContext, startedAt: number, level: 'log' | 'debug' = 'log'): void {
    this.logger[level]('Job processing completed', {
      ...context,
      durationMs: this.getJobDuration(startedAt),
      handlerOutcome: 'completed',
    });
  }

  private logJobFailed(context: JobLogContext, startedAt: number, error: unknown): void {
    let retryOutcome: 'retry_expected' | 'exhausted' | 'unknown' = 'unknown';
    if (context.retryCount !== undefined && context.retryLimit !== undefined) {
      retryOutcome = context.retryCount < context.retryLimit ? 'retry_expected' : 'exhausted';
    }
    this.logger.error('Job processing failed', {
      ...context,
      durationMs: this.getJobDuration(startedAt),
      handlerOutcome: 'failed',
      retryOutcome,
      error,
    });
  }

  private getJobDuration(startedAt: number): number {
    return Math.round((performance.now() - startedAt) * 100) / 100;
  }
}
