import { Test, TestingModule } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { FileProcessorService } from './file-processor/file.processor.service';

describe('WorkerService', () => {
  let service: WorkerService;
  let queueService: QueueService;
  let fileProcessorService: FileProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: QueueService,
          useValue: {
            work: jest.fn(),
          },
        },
        {
          provide: FileProcessorService,
          useValue: {
            process: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
    queueService = module.get<QueueService>(QueueService);
    fileProcessorService = module.get<FileProcessorService>(FileProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register process_file worker with configured batch size', async () => {
    await service.onModuleInit();

    expect(queueService.work).toHaveBeenCalledWith(QueueName.process_file, { batchSize: 1 }, expect.any(Function));
  });
});
