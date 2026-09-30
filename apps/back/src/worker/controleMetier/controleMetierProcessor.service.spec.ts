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
import { DepotError } from '@dossier/depot/depotError';
import { ControleName, ControleType, ErrorCode, EvenementType, ControleStatus, DepotStep } from '@lib/dossier';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_XML_PARSE_BUDGETS } from '@lib/parser';

describe('ControleMetierProcessorService - Technical Error Handling', () => {
  let service: ControleMetierProcessorService;
  let mockDataSource: DataSource;
  let mockS3: S3;
  let mockControleV1Service: ControleV1Service;
  let mockControleMetierV2Service: ControleMetierV2Service;
  let mockDepotService: DepotService;
  let mockDepotCoordinatorService: DepotCoordinatorService;
  let mockControleGateway: ControleGateway;
  const configGet = jest.fn((_key: string): string | undefined => undefined);

  beforeEach(async () => {
    configGet.mockReset();
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
        { provide: ConfigService, useValue: { get: configGet } },
        loggerProviderMock,
      ],
    }).compile();

    service = module.get<ControleMetierProcessorService>(ControleMetierProcessorService);
  });

  it('reparses a file above the default element budget but below the configured budget', async () => {
    // Scenario objects are released as they close, so this exercises the real
    // element counter without retaining millions of objects in the test heap.
    const xml = `<FctAssain>${'<Scenario><CodeScenario>FCT_ASSAIN</CodeScenario><VersionScenario>4</VersionScenario><Emetteur/></Scenario>'.repeat(500_001)}</FctAssain>`;
    configGet.mockImplementation((key) => (key === 'XML_PARSE_MAX_ELEMENTS' ? '2500000' : undefined));
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(xml));
    (mockDataSource.transaction as jest.Mock).mockResolvedValue({ allSuccess: true, resultsV1: [], resultsV2: [] });

    await service.process({ depotId: 'dep_1', filePath: 'file.xml' });

    expect(mockDataSource.transaction).toHaveBeenCalled();
    expect(mockControleGateway.createControle).not.toHaveBeenCalled();
    expect(mockDepotService.update).toHaveBeenLastCalledWith(
      'dep_1',
      expect.objectContaining({
        controleStatus: ControleStatus.SUCCESS,
      }),
    );
  }, 30_000);

  it('keeps a lowered depth budget effective during reparsing', async () => {
    configGet.mockImplementation((key) => (key === 'XML_PARSE_MAX_DEPTH' ? '2' : undefined));
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('<FctAssain><a><b/></a></FctAssain>'));

    await service.process({ depotId: 'dep_1', filePath: 'file.xml' });

    expect(mockDataSource.transaction).not.toHaveBeenCalled();
    expect(mockControleGateway.createControle).not.toHaveBeenCalled();
    expect(mockDepotService.update).toHaveBeenLastCalledWith(
      'dep_1',
      expect.objectContaining({
        error: DepotError.XML_PARSE_BUDGET_EXCEEDED,
      }),
    );
  });

  it('honors a raised depth budget while preserving the default text and element limits', async () => {
    const depth = DEFAULT_XML_PARSE_BUDGETS.maxDepth + 1;
    configGet.mockImplementation((key) => (key === 'XML_PARSE_MAX_DEPTH' ? String(depth + 1) : undefined));
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(`${'<a>'.repeat(depth)}${'</a>'.repeat(depth)}`));
    (mockDataSource.transaction as jest.Mock).mockResolvedValue({ allSuccess: true, resultsV1: [], resultsV2: [] });

    await service.process({ depotId: 'dep_1', filePath: 'file.xml' });

    expect(mockDataSource.transaction).toHaveBeenCalled();
    expect(mockControleGateway.createControle).not.toHaveBeenCalled();
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
      step: DepotStep.CONTROLE_FAILED,
      controleStatus: ControleStatus.FAILED,
      error: DepotError.CONTROLE_METIER_TECHNICAL_FAILURE,
    });

    expect(mockDepotCoordinatorService.checkControlesCompletion).toHaveBeenCalledWith(depotId);
  });
});
