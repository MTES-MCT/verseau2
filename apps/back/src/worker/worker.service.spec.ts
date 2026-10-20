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
import { EmailTemplate } from '@notification/notification';
import { performance } from 'node:perf_hooks';

describe('WorkerService', () => {
  type TestJob = {
    id: string;
    data: {
      depotId?: string;
      template?: EmailTemplate;
      params?: { depotId?: string; to?: string };
      correlationId?: string;
    };
    retryCount?: number;
    retryLimit?: number;
  };

  afterEach(() => jest.restoreAllMocks());

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
      expect(work).toHaveBeenCalledWith(queueName, { batchSize: 1, includeMetadata: true }, expect.any(Function));
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
        data: {
          depotId: 'dep_1',
          template: EmailTemplate.RAPPORT,
          params: { depotId: 'dep_1' },
          correlationId: 'cid_1',
        },
        retryCount: 1,
        retryLimit: 2,
      };

      await expect(handler([job])).rejects.toBe(error);

      const context = {
        queueName,
        jobId: 'job_1',
        depotId: 'dep_1',
        ...(queueName === QueueName.email ? { template: EmailTemplate.RAPPORT } : {}),
        retryCount: 1,
        retryLimit: 2,
        attempt: 2,
      };
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Job processing failed', {
        ...context,
        durationMs: expect.any(Number) as unknown,
        handlerOutcome: 'failed',
        retryOutcome: 'retry_expected',
        error,
      });
      const level = queueName === QueueName.controle_sandre_poll ? 'debug' : 'log';
      expect(logger[level]).toHaveBeenCalledTimes(1);
      expect(logger[level]).toHaveBeenCalledWith('Job processing started', context);
      expect(runWith).toHaveBeenCalledWith({ correlationId: 'cid_1', jobContext: context }, expect.any(Function));
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
    await handler([
      {
        id: 'job_1',
        data: { depotId: 'dep_1', template: EmailTemplate.RAPPORT, params: { depotId: 'dep_1' } },
        retryCount: 0,
        retryLimit: 2,
      },
    ]);

    const level = queueName === QueueName.controle_sandre_poll ? 'debug' : 'log';
    const context = {
      queueName,
      jobId: 'job_1',
      depotId: 'dep_1',
      ...(queueName === QueueName.email ? { template: EmailTemplate.RAPPORT } : {}),
      retryCount: 0,
      retryLimit: 2,
      attempt: 1,
    };
    expect(logger[level]).toHaveBeenCalledTimes(2);
    expect(logger[level]).toHaveBeenNthCalledWith(1, 'Job processing started', context);
    expect(logger[level]).toHaveBeenNthCalledWith(2, 'Job processing completed', {
      ...context,
      durationMs: expect.any(Number) as unknown,
      handlerOutcome: 'completed',
    });
    expect(logger[level === 'log' ? 'debug' : 'log']).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    { retryCount: 0, retryLimit: 0, retryOutcome: 'exhausted' },
    { retryCount: 2, retryLimit: 2, retryOutcome: 'exhausted' },
    { retryCount: undefined, retryLimit: undefined, retryOutcome: 'unknown' },
  ])(
    'reports retry outcome $retryOutcome without changing error propagation',
    async ({ retryCount, retryLimit, retryOutcome }) => {
      const { handlers, logger, process } = await setup();
      const error = new Error('failure');
      process.mockRejectedValue(error);
      const handler = handlers.get(QueueName.process_file)!;

      await expect(handler([{ id: 'job_1', data: { depotId: 'dep_1' }, retryCount, retryLimit }])).rejects.toBe(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Job processing failed',
        expect.objectContaining({ retryOutcome, error }),
      );
    },
  );

  it.each(['completed', 'failed'] as const)('measures %s handler duration with a monotonic clock', async (outcome) => {
    const { handlers, logger, process } = await setup();
    const result = { processed: true };
    const error = new Error('failure');
    if (outcome === 'completed') {
      process.mockResolvedValue(result);
    } else {
      process.mockRejectedValue(error);
    }
    jest.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(125.678);
    const promise = handlers.get(QueueName.process_file)!([{ id: 'job_1', data: { depotId: 'dep_1' } }]);
    if (outcome === 'completed') {
      await expect(promise).resolves.toBe(result);
    } else {
      await expect(promise).rejects.toBe(error);
    }
    expect(logger[outcome === 'completed' ? 'log' : 'error']).toHaveBeenCalledWith(
      `Job processing ${outcome}`,
      expect.objectContaining({ durationMs: 25.68, handlerOutcome: outcome }),
    );
  });

  it('logs report-email depot context but never email parameters', async () => {
    const { handlers, logger, send } = await setup();
    const params = { depotId: 'dep_1', to: 'private@example.com' };
    const job = { id: 'email_1', data: { template: EmailTemplate.RAPPORT, params }, retryCount: 0, retryLimit: 2 };

    await handlers.get(QueueName.email)!([job]);

    expect(send).toHaveBeenCalledWith(EmailTemplate.RAPPORT, params);
    expect(logger.log).toHaveBeenCalledWith(
      'Job processing started',
      expect.objectContaining({ depotId: 'dep_1', jobId: 'email_1' }),
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(params.to);
  });

  it('does not invent depot context for emails without a depot', async () => {
    const { handlers, logger } = await setup();
    await handlers.get(QueueName.email)!([
      { id: 'email_1', data: { template: EmailTemplate.RAPPORT, params: { to: 'private@example.com' } } },
    ]);
    const [, metadata] = logger.log.mock.calls[0] as [string, Record<string, unknown>];
    expect(metadata).not.toHaveProperty('depotId');
    expect(metadata).not.toHaveProperty('attempt');
  });
});
