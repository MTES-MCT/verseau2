import type { ClsService } from 'nestjs-cls';
import type { CustomClsStore } from '@shared/logger/cls-store.interface';
import { QueueName, QueueOptions } from '@queue/queue';
import type { Queue } from '@queue/queue';
import type { LoggerService } from '@shared/logger/logger.service';
import type { FileProcessorService } from './fileProcessor/fileProcessor.service';
import type { SftpAgentVerseauProcessorService } from './sftp/sftpAgentVerseauProcessor.service';
import type { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import type { ControleSandreUploadProcessorService } from './controleSandre/controle-sandre-upload.processor.service';
import type { ControleSandrePollProcessorService } from './controleSandre/controle-sandre-poll.processor.service';
import type { MasaWebhookProcessorService } from './masa/masaWebhookProcessor.service';
import type { DiffusionRapportProcessorService } from './diffusionRapport/diffusionRapportProcessor.service';
import { WorkerService } from './worker.service';
import type { DepotUploadService } from '@dossier/depot/depotUpload.service';

describe('WorkerService', () => {
  type TestJob = {
    id: string;
    data: { depotId: string; template?: string; correlationId?: string };
    retryCount: number;
    retryLimit: number;
  };

  async function setup() {
    const handlers = new Map<QueueName, (jobs: TestJob[]) => Promise<unknown>>();
    const work = jest.fn((name: QueueName, _options: QueueOptions, handler: (jobs: TestJob[]) => Promise<unknown>) => {
      handlers.set(name, handler);
      return Promise.resolve('worker-id');
    });
    const queueService = {
      send: jest.fn(),
      work,
    } as unknown as Queue;

    const runWith = jest.fn((_store: CustomClsStore, callback: () => unknown) => callback());
    const cls = { runWith } as unknown as ClsService<CustomClsStore>;

    const logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const process = jest.fn().mockResolvedValue(undefined);
    const send = jest.fn().mockResolvedValue({ response: {}, body: {} });
    const cleanup = jest.fn().mockResolvedValue(undefined);

    const service = new WorkerService(
      queueService,
      { process } as unknown as FileProcessorService,
      { process } as unknown as SftpAgentVerseauProcessorService,
      { process } as unknown as ControleMetierProcessorService,
      { process } as unknown as ControleSandreUploadProcessorService,
      { process } as unknown as ControleSandrePollProcessorService,
      { process } as unknown as MasaWebhookProcessorService,
      { process } as unknown as DiffusionRapportProcessorService,
      { send },
      cls,
      logger as unknown as LoggerService,
      { cleanup } as unknown as DepotUploadService,
    );

    await service.onModuleInit();

    return { work, handlers, logger, process, send, cleanup, runWith };
  }

  it('registers every queue worker with batchSize 1', async () => {
    const { work } = await setup();

    expect(work).toHaveBeenCalledTimes(Object.values(QueueName).length);

    for (const queueName of Object.values(QueueName)) {
      const expectedOptions =
        queueName === QueueName.controle_sandre_upload ? { batchSize: 1, includeMetadata: true } : { batchSize: 1 };
      expect(work).toHaveBeenCalledWith(queueName, expectedOptions, expect.any(Function));
    }
  });

  it.each(Object.values(QueueName))(
    'logs a propagated %s failure once and preserves it for retry',
    async (queueName) => {
      const { handlers, logger, process, send, cleanup, runWith } = await setup();
      const error = new Error('Unexpected processing failure');
      process.mockRejectedValue(error);
      send.mockRejectedValue(error);
      cleanup.mockRejectedValue(error);
      const handler = handlers.get(queueName);
      if (!handler) {
        throw new Error(`Missing worker for ${queueName}`);
      }
      const job = {
        id: 'job_1',
        data: { depotId: 'dep_1', template: 'template_1', correlationId: 'cid_1' },
        retryCount: 1,
        retryLimit: 2,
      };

      await expect(handler([job])).rejects.toBe(error);

      const context = {
        queueName,
        jobId: 'job_1',
        ...(queueName === QueueName.email ? { template: 'template_1' } : { depotId: 'dep_1' }),
      };
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Job processing failed', {
        ...context,
        error,
      });
      const level = queueName === QueueName.controle_sandre_poll ? 'debug' : 'log';
      expect(logger[level]).toHaveBeenCalledTimes(1);
      expect(logger[level]).toHaveBeenCalledWith('Job processing started', context);
      expect(runWith).toHaveBeenCalledWith({ correlationId: 'cid_1' }, expect.any(Function));
      if (queueName === QueueName.controle_sandre_upload) {
        expect(process).toHaveBeenCalledWith({ ...job.data, retryCount: 1, retryLimit: 2 });
      }
    },
  );

  it.each(Object.values(QueueName))('logs %s start and completion at the operational level', async (queueName) => {
    const { handlers, logger } = await setup();
    const handler = handlers.get(queueName);
    if (!handler) {
      throw new Error(`Missing worker for ${queueName}`);
    }
    await handler([{ id: 'job_1', data: { depotId: 'dep_1', template: 'template_1' }, retryCount: 0, retryLimit: 2 }]);

    const level = queueName === QueueName.controle_sandre_poll ? 'debug' : 'log';
    const context = {
      queueName,
      jobId: 'job_1',
      ...(queueName === QueueName.email ? { template: 'template_1' } : { depotId: 'dep_1' }),
    };
    expect(logger[level]).toHaveBeenCalledTimes(2);
    expect(logger[level]).toHaveBeenNthCalledWith(1, 'Job processing started', context);
    expect(logger[level]).toHaveBeenNthCalledWith(2, 'Job processing completed', context);
    expect(logger[level === 'log' ? 'debug' : 'log']).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
