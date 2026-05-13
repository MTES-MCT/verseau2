import { Test, TestingModule } from '@nestjs/testing';
import { CsvGenerator } from '@lib/shared';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { EvenementService } from './evenement.service';

const DEFAULT_TYPE_EVENEMENT_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

describe('EvenementService', () => {
  let service: EvenementService;
  let masaProviderMock: Partial<MasaProvider>;

  beforeEach(async () => {
    masaProviderMock = {
      findEvenementSteu: jest.fn(),
      findEvenementScl: jest.fn(),
      findSteuBatchBySandreCdas: jest.fn(),
      findSclBatchBySandreCdas: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvenementService,
        PaginatedExportService,
        {
          provide: MasaProvider,
          useValue: masaProviderMock,
        },
        {
          provide: CsvGenerator,
          useValue: { generate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EvenementService>(EvenementService);
  });

  it('passes pointMesureId to masaProvider for STEU when provided', async () => {
    (masaProviderMock.findSteuBatchBySandreCdas as jest.Mock).mockResolvedValue([{ ouvrageDepollutionId: 123 }]);
    (masaProviderMock.findEvenementSteu as jest.Mock).mockResolvedValue({ data: [], total: 0 });

    await service.listEvenementSteu({
      authorizedSteuCdas: ['STEU1'],
      year: 2024,
      pointMesureId: 45,
      page: 1,
      pageSize: 10,
    });

    expect(masaProviderMock.findEvenementSteu).toHaveBeenCalledWith({
      ouvrageDepollutionIds: [123],
      year: 2024,
      typeEvenementCodes: DEFAULT_TYPE_EVENEMENT_CODES,
      pointMesureId: 45,
      page: 1,
      pageSize: 10,
    });
  });

  it('passes a single selected event type as an array for STEU', async () => {
    (masaProviderMock.findSteuBatchBySandreCdas as jest.Mock).mockResolvedValue([{ ouvrageDepollutionId: 123 }]);
    (masaProviderMock.findEvenementSteu as jest.Mock).mockResolvedValue({ data: [], total: 0 });

    await service.listEvenementSteu({
      authorizedSteuCdas: ['STEU1'],
      year: 2024,
      typeEvenementCode: '3',
      page: 1,
      pageSize: 10,
    });

    expect(masaProviderMock.findEvenementSteu).toHaveBeenCalledWith({
      ouvrageDepollutionIds: [123],
      year: 2024,
      typeEvenementCodes: ['3'],
      page: 1,
      pageSize: 10,
    });
  });

  it('passes default event types for SCL when no event type is provided', async () => {
    (masaProviderMock.findSclBatchBySandreCdas as jest.Mock).mockResolvedValue([{ systemeCollecteId: 456 }]);
    (masaProviderMock.findEvenementScl as jest.Mock).mockResolvedValue({ data: [], total: 0 });

    await service.listEvenementScl({
      authorizedSclCdas: ['SCL1'],
      year: 2024,
      page: 1,
      pageSize: 10,
    });

    expect(masaProviderMock.findEvenementScl).toHaveBeenCalledWith({
      systemeCollecteIds: [456],
      year: 2024,
      typeEvenementCodes: DEFAULT_TYPE_EVENEMENT_CODES,
      page: 1,
      pageSize: 10,
    });
  });
});
