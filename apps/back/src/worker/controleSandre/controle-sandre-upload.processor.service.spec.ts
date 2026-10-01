/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ControleSandreUploadProcessorService } from './controle-sandre-upload.processor.service';
import { S3 } from '@s3/s3';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotWorkflowService } from '@dossier/depot/depotWorkflow.service';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { DepotError } from '@dossier/depot/depotError';

describe('ControleSandreUploadProcessorService', () => {
  let service: ControleSandreUploadProcessorService;
  let mockS3: S3;
  let mockSandreService: SandreService;
  let workflow: jest.Mocked<Pick<DepotWorkflowService, 'startSandreValidation' | 'failSandreValidation'>>;
  let mockQueueService: Queue;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockS3 = {
      download: jest.fn(),
    } as unknown as S3;

    mockSandreService = {
      validateFile: jest.fn(),
    } as unknown as SandreService;

    workflow = {
      startSandreValidation: jest.fn().mockResolvedValue(true),
      failSandreValidation: jest.fn().mockResolvedValue(true),
    };

    mockQueueService = {
      send: jest.fn(),
      work: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        ControleSandreUploadProcessorService,
        { provide: S3, useValue: mockS3 },
        { provide: SandreService, useValue: mockSandreService },
        { provide: DepotWorkflowService, useValue: workflow },
        { provide: QueueGateway, useValue: mockQueueService },
        loggerProviderMock,
      ],
    }).compile();

    service = module.get<ControleSandreUploadProcessorService>(ControleSandreUploadProcessorService);
  });

  it('should keep retry behavior before the last attempt', async () => {
    const error = new Error('SANDRE unavailable');
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('<xml />'));
    (mockSandreService.validateFile as jest.Mock).mockRejectedValue(error);

    await expect(
      service.process({
        depotId: 'dep_1',
        filePath: 'depot.xml',
        retryCount: 0,
        retryLimit: 2,
      }),
    ).rejects.toThrow('SANDRE unavailable');

    expect(workflow.startSandreValidation).toHaveBeenCalledWith('dep_1');
    expect(workflow.failSandreValidation).not.toHaveBeenCalled();
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });

  it('should finalize depot state on the last failed attempt', async () => {
    const error = new Error('SANDRE unavailable');
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('<xml />'));
    (mockSandreService.validateFile as jest.Mock).mockRejectedValue(error);

    await expect(
      service.process({
        depotId: 'dep_1',
        filePath: 'depot.xml',
        retryCount: 2,
        retryLimit: 2,
      }),
    ).rejects.toThrow('SANDRE unavailable');

    expect(workflow.startSandreValidation).toHaveBeenCalledWith('dep_1');
    expect(workflow.failSandreValidation).toHaveBeenCalledWith('dep_1', DepotError.SANDRE_UPLOAD_FAILED);
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });

  it('initializes SANDRE as pending and dispatches the delayed polling job', async () => {
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('<xml />'));
    (mockSandreService.validateFile as jest.Mock).mockResolvedValue({ jeton: 'token' });
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(workflow.startSandreValidation).toHaveBeenCalledWith('dep_1');
    expect(mockQueueService.send).toHaveBeenCalledWith(
      QueueName.controle_sandre_poll,
      { depotId: 'dep_1', jeton: 'token', attemptCount: 0 },
      { startAfter: 30 },
    );
  });

  it('does not reopen a finished depot when the transition is refused', async () => {
    workflow.startSandreValidation.mockResolvedValue(false);
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockS3.download).not.toHaveBeenCalled();
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });
});
