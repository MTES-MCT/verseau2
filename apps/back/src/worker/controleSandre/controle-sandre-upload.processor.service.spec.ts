/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ControleSandreUploadProcessorService } from './controle-sandre-upload.processor.service';
import { S3 } from '@s3/s3';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { QueueGateway } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { ControleSandreStatus, DepotStep, DepotStatus } from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';

describe('ControleSandreUploadProcessorService', () => {
  let service: ControleSandreUploadProcessorService;
  let mockS3: S3;
  let mockSandreService: SandreService;
  let mockDepotService: DepotService;
  let mockQueueService: Queue;
  let mockDepotCoordinatorService: DepotCoordinatorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockS3 = {
      download: jest.fn(),
    } as unknown as S3;

    mockSandreService = {
      validateFile: jest.fn(),
    } as unknown as SandreService;

    mockDepotService = {
      update: jest.fn().mockResolvedValue({}),
    } as unknown as DepotService;

    mockQueueService = {
      send: jest.fn(),
      work: jest.fn(),
    } as unknown as Queue;

    mockDepotCoordinatorService = {
      checkControlesCompletion: jest.fn().mockResolvedValue(undefined),
    } as unknown as DepotCoordinatorService;

    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        ControleSandreUploadProcessorService,
        { provide: S3, useValue: mockS3 },
        { provide: SandreService, useValue: mockSandreService },
        { provide: DepotService, useValue: mockDepotService },
        { provide: QueueGateway, useValue: mockQueueService },
        { provide: DepotCoordinatorService, useValue: mockDepotCoordinatorService },
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

    expect(mockDepotService.update).toHaveBeenCalledTimes(1);
    expect(mockDepotService.update).toHaveBeenCalledWith('dep_1', {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
    });
    expect(mockDepotCoordinatorService.checkControlesCompletion).not.toHaveBeenCalled();
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

    expect(mockDepotService.update).toHaveBeenNthCalledWith(1, 'dep_1', {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
    });
    expect(mockDepotService.update).toHaveBeenNthCalledWith(2, 'dep_1', {
      step: DepotStep.CONTROLE_SANDRE_FAILED,
      controleSandreStatus: ControleSandreStatus.FAILED,
      error: DepotError.SANDRE_UPLOAD_FAILED,
    });
    expect(mockDepotCoordinatorService.checkControlesCompletion).toHaveBeenCalledWith('dep_1');
  });
});
