import type { ClsService } from 'nestjs-cls';
import type { CustomClsStore } from '@shared/logger/cls-store.interface';
import { QueueName, QueueOptions } from '@queue/queue';
import type { Queue } from '@queue/queue';
import type { LoggerService } from '@shared/logger/logger.service';
import type { EmailProvider } from '@notification/email.provider';
import type { FileProcessorService } from './fileProcessor/fileProcessor.service';
import type { SftpAgentVerseauProcessorService } from './sftp/sftpAgentVerseauProcessor.service';
import type { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import type { ControleSandreUploadProcessorService } from './controleSandre/controle-sandre-upload.processor.service';
import type { ControleSandrePollProcessorService } from './controleSandre/controle-sandre-poll.processor.service';
import type { MasaWebhookProcessorService } from './masa/masaWebhookProcessor.service';
import type { DiffusionRapportProcessorService } from './diffusionRapport/diffusionRapportProcessor.service';
import { WorkerService } from './worker.service';

describe('WorkerService', () => {
  it('registers every queue worker with single-job batches and bounded concurrency', async () => {
    const work = jest.fn().mockResolvedValue('worker-id');
    const queueService = {
      send: jest.fn(),
      work,
    } as unknown as Queue;

    const cls = {
      runWith: jest.fn((_store: CustomClsStore, callback: () => unknown) => callback()),
    } as unknown as ClsService<CustomClsStore>;

    const logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as LoggerService;

    const service = new WorkerService(
      queueService,
      { process: jest.fn() } as unknown as FileProcessorService,
      { process: jest.fn() } as unknown as SftpAgentVerseauProcessorService,
      { process: jest.fn() } as unknown as ControleMetierProcessorService,
      { process: jest.fn() } as unknown as ControleSandreUploadProcessorService,
      { process: jest.fn() } as unknown as ControleSandrePollProcessorService,
      { process: jest.fn() } as unknown as MasaWebhookProcessorService,
      { process: jest.fn() } as unknown as DiffusionRapportProcessorService,
      { send: jest.fn() } as unknown as EmailProvider,
      cls,
      logger,
    );

    await service.onModuleInit();

    expect(work).toHaveBeenCalledTimes(Object.values(QueueName).length);

    const expectedOptions: Record<QueueName, QueueOptions> = {
      [QueueName.process_file]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.email]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.send_to_sftp]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.controle_metier]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.controle_sandre_upload]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.controle_sandre_poll]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.process_after_masa_webhook]: { batchSize: 1, localConcurrency: 10 },
      [QueueName.diffusion_rapport]: { batchSize: 1, localConcurrency: 10 },
    };

    for (const queueName of Object.values(QueueName)) {
      const options = expectedOptions[queueName];
      const registeredOptions =
        queueName === QueueName.controle_sandre_upload ? { ...options, includeMetadata: true } : options;
      expect(work).toHaveBeenCalledWith(queueName, registeredOptions, expect.any(Function));
    }
  });
});
