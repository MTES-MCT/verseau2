/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { CsvGenerator } from '@lib/shared';
import { MasaProvider } from '@masa/masa.provider';
import { CodeParametre } from '@referentiel/parametre/codeParametre';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { BilanService } from './bilan.service';

describe('BilanService', () => {
  let service: BilanService;
  let masaProviderMock: Partial<MasaProvider>;
  let csvGeneratorMock: { generate: jest.Mock };

  beforeEach(async () => {
    masaProviderMock = {
      findBilanSteu: jest.fn(),
      findBilanScl: jest.fn(),
      findSteuBatchBySandreCdas: jest.fn(),
      findSclBatchBySandreCdas: jest.fn(),
    };
    csvGeneratorMock = {
      generate: jest.fn().mockReturnValue('csv-content'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilanService,
        PaginatedExportService,
        {
          provide: MasaProvider,
          useValue: masaProviderMock,
        },
        {
          provide: CsvGenerator,
          useValue: csvGeneratorMock,
        },
      ],
    }).compile();

    service = module.get<BilanService>(BilanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listBilanSteu', () => {
    it('returns empty when no authorized steu cdas', async () => {
      const result = await service.listBilanSteu({
        authorizedSteuCdas: [],
        year: 2024,
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('calls masaProvider with resolved cdns', async () => {
      (masaProviderMock.findSteuBatchBySandreCdas as any).mockResolvedValue([{ ouvrageDepollutionId: 123 }]);
      (masaProviderMock.findBilanSteu as any).mockResolvedValue({
        data: [
          {
            steuCdn: 123,
            ouvrageDepollutionCode: 'STEU1',
            bilanEcarteParSpe: false,
            date: '2024-01-01',
            parametreNom: 'DBO5',
            hcnf: 'Non',
            evt: 'Non',
            finalite: 'Autosurveillance',
          },
        ],
        total: 1,
      });

      const result = await service.listBilanSteu({
        authorizedSteuCdas: ['STEU1'],
        year: 2024,
        page: 1,
        pageSize: 10,
      });

      expect(masaProviderMock.findSteuBatchBySandreCdas).toHaveBeenCalledWith(['STEU1']);
      expect(masaProviderMock.findBilanSteu).toHaveBeenCalledWith({
        ouvrageDepollutionIds: [123],
        year: 2024,
        parametreCodes: [
          CodeParametre.DBO5,
          CodeParametre.DCO,
          CodeParametre.MES,
          CodeParametre.NGL,
          CodeParametre.N_NH4,
          CodeParametre.NTK,
          CodeParametre.NO2,
          CodeParametre.NO3,
          CodeParametre.pH,
          CodeParametre.Temperature,
          CodeParametre.Ptot,
        ].map(String),
        page: 1,
        pageSize: 10,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('listBilanScl', () => {
    it('returns empty when no authorized scl cdas', async () => {
      const result = await service.listBilanScl({
        authorizedSclCdas: [],
        year: 2024,
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('exportBilanSteuCsv', () => {
    it('collects all pages and generates csv', async () => {
      (masaProviderMock.findSteuBatchBySandreCdas as any).mockResolvedValue([{ ouvrageDepollutionId: 123 }]);
      (masaProviderMock.findBilanSteu as any)
        .mockResolvedValueOnce({
          data: [
            {
              steuCdn: 123,
              ouvrageDepollutionCode: 'STEU1',
              bilanEcarteParSpe: false,
              date: '2024-01-01',
              parametreNom: 'DBO5',
              hcnf: 'Non',
              evt: 'Non',
              finalite: 'Autosurveillance',
            },
          ],
          total: 1001,
        })
        .mockResolvedValueOnce({
          data: [
            {
              steuCdn: 124,
              ouvrageDepollutionCode: 'STEU2',
              bilanEcarteParSpe: true,
              date: '2024-01-02',
              parametreNom: 'DCO',
              hcnf: 'Oui',
              evt: 'Non',
              finalite: 'Autosurveillance',
            },
          ],
          total: 1001,
        });

      const result = await service.exportBilanSteuCsv({
        authorizedSteuCdas: ['STEU1'],
        year: 2024,
        page: 1,
        pageSize: 10,
      });

      expect(result).toBe('csv-content');
      expect(masaProviderMock.findBilanSteu).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ page: 1, pageSize: 1000 }),
      );
      expect(masaProviderMock.findBilanSteu).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ page: 2, pageSize: 1000 }),
      );
      expect(csvGeneratorMock.generate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.arrayContaining([expect.any(Object)]),
      );
    });
  });
});
