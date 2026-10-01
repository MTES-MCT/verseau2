/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
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
  EtapeMetier,
} from '@lib/dossier';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';

describe('ControleMetierProcessorService - sequential dispatch', () => {
  let service: ControleMetierProcessorService;
  let mockDataSource: DataSource;
  let mockS3: S3;
  let mockControleV1Service: ControleV1Service;
  let mockControleMetierV2Service: ControleMetierV2Service;
  let mockDepotService: DepotService;
  let mockQueueService: Queue;
  let mockControleGateway: ControleGateway;

  const depotId = 'depot_test_001';
  const filePath = 'test.xml';

  const aControle = (
    overloads: Partial<{ success: boolean; evenementType: EvenementType }> = {},
  ): {
    success: boolean;
    evenementType: EvenementType;
  } => ({
    success: true,
    evenementType: EvenementType.INFORMATION,
    ...overloads,
  });

  beforeEach(async () => {
    mockS3 = {
      download: jest.fn(),
    } as unknown as S3;

    mockDataSource = {
      transaction: jest.fn(),
    } as unknown as DataSource;

    mockControleV1Service = {
      execute: jest.fn(),
    } as unknown as ControleV1Service;

    mockControleMetierV2Service = {
      execute: jest.fn(),
    } as unknown as ControleMetierV2Service;

    mockDepotService = {
      update: jest.fn().mockResolvedValue({}),
    } as unknown as DepotService;

    mockQueueService = {
      send: jest.fn().mockResolvedValue('job-id'),
      work: jest.fn(),
    };

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
        { provide: QueueGateway, useValue: mockQueueService },
        { provide: ControleGateway, useValue: mockControleGateway },
        loggerProviderMock,
      ],
    }).compile();

    service = module.get<ControleMetierProcessorService>(ControleMetierProcessorService);

    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('<?xml version="1.0"?><root></root>'));
  });

  describe('when business controls succeed', () => {
    it('dispatches the SANDRE control job', async () => {
      (mockDataSource.transaction as jest.Mock).mockImplementation((callback) =>
        Promise.resolve(
          callback({
            // transaction manager mock - not used directly by the mocked services
          }),
        ),
      );
      (mockControleV1Service.execute as jest.Mock).mockResolvedValue([aControle()]);
      (mockControleMetierV2Service.execute as jest.Mock).mockResolvedValue([aControle()]);

      await service.process({ depotId, filePath });

      expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
        controleStatus: ControleStatus.SUCCESS,
        step: DepotStep.CONTROLE_COMPLETED,
        etapeMetier: EtapeMetier.CONTROLE_METIER,
      });

      expect(mockQueueService.send).toHaveBeenCalledTimes(1);
      expect(mockQueueService.send).toHaveBeenCalledWith(QueueName.controle_sandre_upload, {
        depotId,
        filePath,
      });
      expect(mockQueueService.send).not.toHaveBeenCalledWith(QueueName.diffusion_rapport, expect.anything());
    });
  });

  describe('when business controls fail', () => {
    it('rejects the depot, sends a rapport to the deposant and does not dispatch SANDRE', async () => {
      (mockDataSource.transaction as jest.Mock).mockImplementation((callback) =>
        Promise.resolve(
          callback({
            // transaction manager mock - not used directly by the mocked services
          }),
        ),
      );
      (mockControleV1Service.execute as jest.Mock).mockResolvedValue([
        aControle({ success: false, evenementType: EvenementType.ERREUR }),
      ]);
      (mockControleMetierV2Service.execute as jest.Mock).mockResolvedValue([aControle()]);

      await service.process({ depotId, filePath });

      expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.REJETE,
        controleStatus: ControleStatus.FAILED,
        step: DepotStep.CONTROLE_FAILED,
        etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
      });

      expect(mockQueueService.send).toHaveBeenCalledTimes(1);
      expect(mockQueueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
        depotId,
        destinataires: [RapportDestinataire.DEPOSANT],
      });
      expect(mockQueueService.send).not.toHaveBeenCalledWith(QueueName.controle_sandre_upload, expect.anything());
    });
  });

  describe('when a technical error occurs', () => {
    it('creates a technical error control and rejects the depot without rapport or SANDRE dispatch', async () => {
      const testError = new Error('Database connection timeout');

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

      expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
        controleStatus: ControleStatus.FAILED,
        error: DepotError.CONTROLE_METIER_TECHNICAL_FAILURE,
      });

      expect(mockQueueService.send).not.toHaveBeenCalled();
    });
  });
});
