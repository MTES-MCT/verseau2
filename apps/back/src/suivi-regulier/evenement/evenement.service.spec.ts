import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CsvGenerator } from '@shared/csv/csv.types';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { getStartOfYearAsUTCDate } from '@lib/shared';
import { EvenementService } from './evenement.service';

const DEFAULT_TYPE_EVENEMENT_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

describe('EvenementService', () => {
  let service: EvenementService;
  let masaProviderMock: DeepMocked<MasaProvider>;
  let csvGenerator: { generate: jest.Mock };

  beforeEach(async () => {
    masaProviderMock = createMock<MasaProvider>();

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

  describe('listAvailablePointsMesure', () => {
    it('returns measurement points grouped by collection system', async () => {
      masaProviderMock.findSclBatchBySandreCdas.mockResolvedValue([
        { systemeCollecteCode: 'SCL1', systemeCollecteId: 501 },
      ]);
      const pointsBySystemeCollecte = {
        '501': [
          {
            pointMesureId: 9001,
            pointMesureNumero: 'A2',
            pointMesureLibelle: null,
            pointMesureLocalisationGlobale: 'A2',
          },
        ],
      };
      masaProviderMock.findPointsMesureBySystemesCollecte.mockResolvedValue(pointsBySystemeCollecte);

      await expect(service.listAvailablePointsMesure(['SCL1'])).resolves.toEqual(pointsBySystemeCollecte);
      expect(masaProviderMock.findPointsMesureBySystemesCollecte).toHaveBeenCalledWith([501]);
    });

    it('returns an empty object when no collection systems are authorized', async () => {
      await expect(service.listAvailablePointsMesure([])).resolves.toEqual({});
      expect(masaProviderMock.findPointsMesureBySystemesCollecte).not.toHaveBeenCalled();
    });

    it('returns an empty object when authorized codes resolve to no collection systems', async () => {
      masaProviderMock.findSclBatchBySandreCdas.mockResolvedValue([]);

      await expect(service.listAvailablePointsMesure(['SCL1'])).resolves.toEqual({});
      expect(masaProviderMock.findPointsMesureBySystemesCollecte).not.toHaveBeenCalled();
    });
  });

  it('does not pass pointMesureId to masaProvider for STEU', async () => {
    masaProviderMock.findSteuBatchBySandreCdas.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', ouvrageDepollutionId: 123 },
    ]);
    masaProviderMock.findEvenementSteu.mockResolvedValue({ data: [], total: 0 });

    await service.listEvenementSteu({
      authorizedSteuCdas: ['STEU1'],
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
      page: 1,
      pageSize: 10,
    });

    expect(masaProviderMock.findEvenementSteu).toHaveBeenCalledWith({
      ouvrageDepollutionIds: [123],
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
      typeEvenementCodes: DEFAULT_TYPE_EVENEMENT_CODES,
      page: 1,
      pageSize: 10,
    });
  });

  it('passes a single selected event type as an array for STEU', async () => {
    masaProviderMock.findSteuBatchBySandreCdas.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', ouvrageDepollutionId: 123 },
    ]);
    masaProviderMock.findEvenementSteu.mockResolvedValue({ data: [], total: 0 });

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
    masaProviderMock.findSclBatchBySandreCdas.mockResolvedValue([
      { systemeCollecteCode: 'SCL1', systemeCollecteId: 456 },
    ]);
    masaProviderMock.findEvenementScl.mockResolvedValue({ data: [], total: 0 });

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
    masaProviderMock.findSteuBatchBySandreCdas.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', ouvrageDepollutionId: 123 },
    ]);
    masaProviderMock.findEvenementSteu.mockResolvedValue({
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
      startDate: getStartOfYearAsUTCDate(2024),
      endDate: getStartOfYearAsUTCDate(2025),
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
    masaProviderMock.findSclBatchBySandreCdas.mockResolvedValue([
      { systemeCollecteCode: 'SCL1', systemeCollecteId: 456 },
    ]);
    masaProviderMock.findEvenementScl.mockResolvedValue({
      data: [
        {
          systemeCollecteCode: 'SCL1',
          systemeCollecteNom: 'Réseau 1',
          ouvrageDepollutionCode: 'STEU1',
          ouvrageDepollutionNom: null,
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
