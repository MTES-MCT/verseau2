/* eslint-disable @typescript-eslint/unbound-method */
import type { ClsService } from 'nestjs-cls';
import type { CustomClsStore } from '@shared/logger/cls-store.interface';
import { QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import type { LoggerService } from '@shared/logger/logger.service';
import type { MemoryMonitorService } from '@shared/memory-monitor/memoryMonitor.service';
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
  const buildDependencies = () => {
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

    const fileProcessor = { process: jest.fn().mockResolvedValue(undefined) } as unknown as FileProcessorService;

    const memoryMonitor = {
      getMemoryUsage: jest.fn().mockReturnValue({ rss: 1, heapTotal: 2, heapUsed: 1, external: 0, arrayBuffers: 0 }),
      logMemoryUsage: jest.fn(),
    } as unknown as MemoryMonitorService;

    const service = new WorkerService(
      queueService,
      fileProcessor,
      { process: jest.fn() } as unknown as SftpAgentVerseauProcessorService,
      { process: jest.fn() } as unknown as ControleMetierProcessorService,
      { process: jest.fn() } as unknown as ControleSandreUploadProcessorService,
      { process: jest.fn() } as unknown as ControleSandrePollProcessorService,
      { process: jest.fn() } as unknown as MasaWebhookProcessorService,
      { process: jest.fn() } as unknown as DiffusionRapportProcessorService,
      { send: jest.fn() },
      cls,
      logger,
      { cleanup: jest.fn() } as unknown as DepotUploadService,
      memoryMonitor,
    );

    return { work, queueService, cls, logger, fileProcessor, memoryMonitor, service };
  };

  it('registers every queue worker with batchSize 1', async () => {
    const { work, service } = buildDependencies();

    await service.onModuleInit();

    expect(work).toHaveBeenCalledTimes(Object.values(QueueName).length);

    for (const queueName of Object.values(QueueName)) {
      const expectedOptions =
        queueName === QueueName.controle_sandre_upload ? { batchSize: 1, includeMetadata: true } : { batchSize: 1 };
      expect(work).toHaveBeenCalledWith(queueName, expectedOptions, expect.any(Function));
    }
  });

  it('logs memory usage at job boundaries', async () => {
    const { work, service, fileProcessor, memoryMonitor } = buildDependencies();

    await service.onModuleInit();

    type WorkCall = [QueueName, unknown, (jobs: { id: string; data: object }[]) => Promise<unknown>];
    const registrations = work.mock.calls as WorkCall[];
    const processFileRegistration = registrations.find(([name]) => name === QueueName.process_file);
    expect(processFileRegistration).toBeDefined();
    const handler = processFileRegistration![2];

    await handler([
      {
        id: 'job-1',
        data: { depotId: 'dep_1', filePath: 'depots/dep_1/file.xml', utilisateur: { id: 'user-1' } },
      },
    ]);

    expect(fileProcessor.process).toHaveBeenCalledTimes(1);
    expect(memoryMonitor.getMemoryUsage).toHaveBeenCalledTimes(2);
    expect(memoryMonitor.logMemoryUsage).toHaveBeenNthCalledWith(1, 'job job-1 start', expect.anything());
    expect(memoryMonitor.logMemoryUsage).toHaveBeenNthCalledWith(2, 'job job-1 end', expect.anything());
  });
});
