/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ControleSandreUploadProcessorService } from './controle-sandre-upload.processor.service';
import { S3 } from '@s3/s3';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { ControleSandreStatus, ControleStatus, DepotStep, DepotStatus } from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';

describe('ControleSandreUploadProcessorService', () => {
  let service: ControleSandreUploadProcessorService;
  let mockS3: S3;
  let mockSandreService: SandreService;
  let mockDepotService: DepotService;
  let mockQueueService: Queue;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockS3 = {
      download: jest.fn(),
    } as unknown as S3;

    mockSandreService = {
      validateFile: jest.fn(),
    } as unknown as SandreService;

    mockDepotService = {
      findById: jest.fn().mockResolvedValue({ controleStatus: ControleStatus.SUCCESS }),
      transition: jest.fn().mockResolvedValue(true),
    } as unknown as DepotService;

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
        { provide: DepotService, useValue: mockDepotService },
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

    expect(mockDepotService.transition).toHaveBeenCalledTimes(1);
    expect(mockDepotService.transition).toHaveBeenCalledWith(
      'dep_1',
      [DepotStep.CONTROLE_COMPLETED, DepotStep.PARSER_SANDRE_IN_PROGRESS],
      {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
        controleSandreStatus: ControleSandreStatus.PENDING,
      },
    );
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

    expect(mockDepotService.transition).toHaveBeenNthCalledWith(
      1,
      'dep_1',
      [DepotStep.CONTROLE_COMPLETED, DepotStep.PARSER_SANDRE_IN_PROGRESS],
      {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
        controleSandreStatus: ControleSandreStatus.PENDING,
      },
    );
    expect(mockDepotService.transition).toHaveBeenNthCalledWith(2, 'dep_1', [DepotStep.PARSER_SANDRE_IN_PROGRESS], {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_SANDRE_FAILED,
      controleSandreStatus: ControleSandreStatus.FAILED,
      error: DepotError.SANDRE_UPLOAD_FAILED,
    });
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });

  it('initializes SANDRE as pending and dispatches the delayed polling job', async () => {
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('<xml />'));
    (mockSandreService.validateFile as jest.Mock).mockResolvedValue({ jeton: 'token' });
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockDepotService.transition).toHaveBeenCalledWith(
      'dep_1',
      expect.any(Array),
      expect.objectContaining({ controleSandreStatus: ControleSandreStatus.PENDING }),
    );
    expect(mockQueueService.send).toHaveBeenCalledWith(
      QueueName.controle_sandre_poll,
      { depotId: 'dep_1', jeton: 'token', attemptCount: 0 },
      { startAfter: 30 },
    );
  });

  it.each([ControleStatus.PENDING, ControleStatus.FAILED, undefined])(
    'does not start SANDRE with business status %s',
    async (controleStatus) => {
      (mockDepotService.findById as jest.Mock).mockResolvedValue({ controleStatus });
      await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
      expect(mockDepotService.transition).not.toHaveBeenCalled();
      expect(mockS3.download).not.toHaveBeenCalled();
      expect(mockQueueService.send).not.toHaveBeenCalled();
    },
  );

  it('does not reopen a finished depot when the transition is refused', async () => {
    (mockDepotService.transition as jest.Mock).mockResolvedValue(false);
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockS3.download).not.toHaveBeenCalled();
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });

  it.each([ControleSandreStatus.SUCCESS, ControleSandreStatus.FAILED])(
    'ignores an upload replay after SANDRE %s',
    async (controleSandreStatus) => {
      (mockDepotService.findById as jest.Mock).mockResolvedValue({
        controleStatus: ControleStatus.SUCCESS,
        controleSandreStatus,
      });
      await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
      expect(mockDepotService.transition).not.toHaveBeenCalled();
      expect(mockQueueService.send).not.toHaveBeenCalled();
    },
  );
});
