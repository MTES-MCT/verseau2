/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ControleMetierProcessorService } from './controleMetierProcessor.service';
import { ControleMetierV2Service } from '@dossier/controle/metierv2/controleMetierV2.service';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { S3 } from '@s3/s3';
import {
  ControleName,
  ControleType,
  ErrorCode,
  EvenementType,
  DepotStatus,
  DepotStep,
  ControleStatus,
} from '@lib/dossier';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';

describe('ControleMetierProcessorService - Technical Error Handling', () => {
  let service: ControleMetierProcessorService;
  let mockDataSource: DataSource;
  let mockS3: S3;
  let mockControleV1Service: ControleV1Service;
  let mockControleMetierV2Service: ControleMetierV2Service;
  let mockDepotService: DepotService;
  let mockDepotCoordinatorService: DepotCoordinatorService;
  let mockControleGateway: ControleGateway;

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
      update: jest.fn(),
    } as unknown as DepotService;

    mockDepotCoordinatorService = {
      checkControlesCompletion: jest.fn(),
    } as unknown as DepotCoordinatorService;

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
        { provide: DepotCoordinatorService, useValue: mockDepotCoordinatorService },
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
    (mockDepotService.update as jest.Mock).mockResolvedValue({});
    (mockControleGateway.createControle as jest.Mock).mockResolvedValue({});

    try {
      await service.process({ depotId, filePath });
    } catch (error) {
      expect(error).toBe(testError);
    }

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
    });
  });
});
