/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ControleMetierProcessorService } from './controleMetierProcessor.service';
import { ControleMetierV2Service } from '@dossier/controle/metierv2/controleMetierV2.service';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { DepotService } from '@dossier/depot/depot.service';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { S3 } from '@s3/s3';
import { DepotError } from '@dossier/depot/depotError';
import {
  ControleName,
  ControleType,
  ErrorCode,
  EvenementType,
  ControleStatus,
  DepotStep,
  DepotStatus,
} from '@lib/dossier';
import { QueueName, RapportDestinataire } from '@queue/queue';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';

describe('ControleMetierProcessorService', () => {
  let service: ControleMetierProcessorService;
  let mockDataSource: DataSource;
  let mockS3: S3;
  let mockControleV1Service: ControleV1Service;
  let mockControleMetierV2Service: ControleMetierV2Service;
  let mockDepotService: DepotService;
  let mockControleGateway: ControleGateway;

  beforeEach(async () => {
    mockS3 = {
      download: jest.fn().mockResolvedValue(Buffer.from('<root />')),
    } as unknown as S3;

    mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation((operation: (manager: EntityManager) => Promise<unknown>) =>
          operation(new EntityManager(mockDataSource)),
        ),
    } as unknown as DataSource;

    mockControleV1Service = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as ControleV1Service;

    mockControleMetierV2Service = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as ControleMetierV2Service;

    mockDepotService = {
      findById: jest.fn().mockResolvedValue({
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.CONTROLE_IN_PROGRESS,
      }),
      transition: jest.fn().mockResolvedValue(true),
    } as unknown as DepotService;

    mockControleGateway = {
      createControle: jest.fn(),
    } as unknown as ControleGateway;

    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        ControleMetierProcessorService,
        { provide: S3, useValue: mockS3 },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ControleV1Service, useValue: mockControleV1Service },
        { provide: ControleMetierV2Service, useValue: mockControleMetierV2Service },
        { provide: DepotService, useValue: mockDepotService },
        { provide: ControleGateway, useValue: mockControleGateway },
        loggerProviderMock,
      ],
    }).compile();

    service = module.get<ControleMetierProcessorService>(ControleMetierProcessorService);
  });

  it('should create technical error control when transaction throws', async () => {
    const depotId = 'depot_test_001';
    const filePath = 'test.xml';
    const mockXmlContent = '<?xml version="1.0"?><root></root>';
    const testError = new Error('Database connection timeout');

    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(mockXmlContent));
    (mockDataSource.transaction as jest.Mock).mockImplementation((): Promise<never> => {
      throw testError;
    });
    (mockControleGateway.createControle as jest.Mock).mockResolvedValue({});

    await service.process({ depotId, filePath });

    expect(mockControleGateway.createControle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ControleName.CTL_TECHNICAL_ERROR,
        type: ControleType.CONTROLE_V2,
        success: false,
        evenementType: EvenementType.ERREUR,
        error: ErrorCode.E2_999,
        depotId,
      }),
    );

    expect(mockDepotService.transition).toHaveBeenCalledWith(depotId, [DepotStep.CONTROLE_IN_PROGRESS], {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_FAILED,
      controleStatus: ControleStatus.FAILED,
      error: DepotError.CONTROLE_METIER_TECHNICAL_FAILURE,
    });

    expect(mockDepotService.transition).toHaveBeenCalledTimes(1);
  });

  it('dispatches SANDRE only after the business transaction completes', async () => {
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockDepotService.transition).toHaveBeenCalledWith(
      'dep_1',
      [DepotStep.CONTROLE_IN_PROGRESS],
      expect.objectContaining({ controleStatus: ControleStatus.SUCCESS, step: DepotStep.CONTROLE_COMPLETED }),
      { name: QueueName.controle_sandre_upload, data: { depotId: 'dep_1', filePath: 'test.xml' } },
    );
    expect((mockControleMetierV2Service.execute as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (mockDepotService.transition as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it.each(['V1', 'V2'])('rejects immediately and reports blocking %s errors without SANDRE', async (version) => {
    const controles = version === 'V1' ? mockControleV1Service : mockControleMetierV2Service;
    (controles.execute as jest.Mock).mockResolvedValue([{ success: false, evenementType: EvenementType.ERREUR }]);
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockDepotService.transition).toHaveBeenCalledTimes(1);
    expect(mockDepotService.transition).toHaveBeenCalledWith(
      'dep_1',
      [DepotStep.CONTROLE_IN_PROGRESS],
      expect.objectContaining({
        status: DepotStatus.REJETE,
        controleStatus: ControleStatus.FAILED,
        step: DepotStep.CONTROLE_FAILED,
      }),
      { name: QueueName.diffusion_rapport, data: { depotId: 'dep_1', destinataires: [RapportDestinataire.DEPOSANT] } },
    );
  });

  it('allows non-blocking warnings to continue to SANDRE', async () => {
    (mockControleMetierV2Service.execute as jest.Mock).mockResolvedValue([
      { success: false, evenementType: EvenementType.AVERTISSEMENT },
    ]);
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockDepotService.transition).toHaveBeenCalledWith(
      'dep_1',
      [DepotStep.CONTROLE_IN_PROGRESS],
      expect.objectContaining({ controleStatus: ControleStatus.SUCCESS }),
      expect.objectContaining({ name: QueueName.controle_sandre_upload }),
    );
  });

  it.each([
    { status: DepotStatus.REJETE, step: DepotStep.CONTROLE_FAILED },
    { status: DepotStatus.INTEGRE, step: DepotStep.SFTP_COMPLETED },
    { status: DepotStatus.INTEGRE_PARTIELLEMENT, step: DepotStep.SFTP_COMPLETED },
    { status: DepotStatus.EN_COURS_DE_TRAITEMENT, step: DepotStep.READY_FOR_SFTP },
    { status: DepotStatus.EN_COURS_DE_TRAITEMENT, step: DepotStep.PARSER_SANDRE_IN_PROGRESS },
  ])('ignores late/replayed jobs in $status / $step', async (depot) => {
    (mockDepotService.findById as jest.Mock).mockResolvedValue(depot);
    await service.process({ depotId: 'dep_1', filePath: 'test.xml' });
    expect(mockS3.download).not.toHaveBeenCalled();
    expect(mockDepotService.transition).not.toHaveBeenCalled();
  });

  it('propagates follow-up enqueue failures without recording a technical control failure', async () => {
    (mockDepotService.transition as jest.Mock).mockRejectedValue(new Error('Enqueue failed'));
    await expect(service.process({ depotId: 'dep_1', filePath: 'test.xml' })).rejects.toThrow('Enqueue failed');
    expect(mockControleGateway.createControle).not.toHaveBeenCalled();
  });
});
