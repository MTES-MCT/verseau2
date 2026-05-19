import type { ClsService } from 'nestjs-cls';
import type { CustomClsStore } from '@shared/logger/cls-store.interface';
import { QueueName } from '@queue/queue';
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
  it('registers every queue worker with batchSize 1', async () => {
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

    for (const queueName of Object.values(QueueName)) {
      const expectedOptions =
        queueName === QueueName.controle_sandre_upload ? { batchSize: 1, includeMetadata: true } : { batchSize: 1 };
      expect(work).toHaveBeenCalledWith(queueName, expectedOptions, expect.any(Function));
    }
  });
});
