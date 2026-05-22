import { Test, TestingModule } from '@nestjs/testing';
import { CsvGenerator } from '@shared/csv/csv.types';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { getStartOfYearAsUTCDate } from '@lib/shared';
import { EvenementService } from './evenement.service';

const DEFAULT_TYPE_EVENEMENT_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

describe('EvenementService', () => {
  let service: EvenementService;
  let masaProviderMock: Partial<MasaProvider>;
  let csvGenerator: { generate: jest.Mock };

  beforeEach(async () => {
    masaProviderMock = {
      findEvenementSteu: jest.fn(),
      findEvenementScl: jest.fn(),
      findSteuBatchBySandreCdas: jest.fn(),
      findSclBatchBySandreCdas: jest.fn(),
    };

    csvGenerator = { generate: jest.fn().mockReturnValue('csv-content') };

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
          useValue: csvGenerator,
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
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
      pointMesureId: 45,
      page: 1,
      pageSize: 10,
    });

    expect(masaProviderMock.findEvenementSteu).toHaveBeenCalledWith({
      ouvrageDepollutionIds: [123],
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
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
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
      typeEvenementCode: '3',
      page: 1,
      pageSize: 10,
    });

    expect(masaProviderMock.findEvenementSteu).toHaveBeenCalledWith({
      ouvrageDepollutionIds: [123],
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
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
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
      typeEvenementCodes: DEFAULT_TYPE_EVENEMENT_CODES,
      page: 1,
      pageSize: 10,
    });
  });

  it('formats STEU export rows before generating csv', async () => {
    (masaProviderMock.findSteuBatchBySandreCdas as jest.Mock).mockResolvedValue([{ ouvrageDepollutionId: 123 }]);
    (masaProviderMock.findEvenementSteu as jest.Mock).mockResolvedValue({
      data: [
        {
          ouvrageDepollutionCode: 'STEU1',
          ouvrageDepollutionNom: null,
          prisEnCompte: true,
          date: '2024-01-15',
          typeEvenementCode: '3',
          typeEvenementLibelle: 'Bypass',
          finalite: null,
          commentaire: 'RAS',
        },
      ],
      total: 1,
    });

    const result = await service.exportEvenementSteuCsv({
      authorizedSteuCdas: ['STEU1'],
      year: 2024,
      page: 1,
      pageSize: 10,
    });

    expect(result).toBe('csv-content');
    expect(csvGenerator.generate).toHaveBeenCalledWith(expect.any(Array), [
      {
        prisEnCompte: 'Pris en compte',
        ouvrageDepollutionCode: 'STEU1',
        ouvrageDepollutionNom: '-',
        date: '15/01/2024',
        typeEvenement: '3-Bypass',
        finalite: '-',
        commentaire: 'RAS',
      },
    ]);
  });

  it('formats SCL export rows before generating csv', async () => {
    (masaProviderMock.findSclBatchBySandreCdas as jest.Mock).mockResolvedValue([{ systemeCollecteId: 456 }]);
    (masaProviderMock.findEvenementScl as jest.Mock).mockResolvedValue({
      data: [
        {
          systemeCollecteCode: 'SCL1',
          systemeCollecteNom: 'Réseau 1',
          prisEnCompte: false,
          date: '2024-02-20',
          typeEvenementCode: '2',
          typeEvenementLibelle: 'Déversement',
          finalite: 'AUTO',
          commentaire: null,
          pointMesureNumero: '12',
          pointMesureLibelle: null,
        },
      ],
      total: 1,
    });

    const result = await service.exportEvenementSclCsv({
      authorizedSclCdas: ['SCL1'],
      year: 2024,
      page: 1,
      pageSize: 10,
    });

    expect(result).toBe('csv-content');
    expect(csvGenerator.generate).toHaveBeenCalledWith(expect.any(Array), [
      {
        prisEnCompte: 'Non pris en compte',
        systemeCollecteCode: 'SCL1',
        systemeCollecteNom: 'Réseau 1',
        date: '20/02/2024',
        typeEvenement: '2-Déversement',
        finalite: 'AUTO',
        commentaire: '-',
        pointMesure: '12 - -',
      },
    ]);
  });
});
