/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { CsvGenerator } from '@lib/shared';
import { TransmissionASRetardService } from './transmissionASRetard.service';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';

describe('TransmissionASRetardService', () => {
  let service: TransmissionASRetardService;
  let masaProvider: jest.Mocked<MasaProvider>;
  let csvGenerator: { generate: jest.Mock };

  beforeEach(async () => {
    csvGenerator = { generate: jest.fn().mockReturnValue('csv-content') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransmissionASRetardService,
        PaginatedExportService,
        {
          provide: MasaProvider,
          useValue: {
            findTransmissionASRetardSteu: jest.fn(),
            findTransmissionASRetardScl: jest.fn(),
            findSteuBatchBySandreCdas: jest.fn(),
            findSclBatchBySandreCdas: jest.fn(),
          },
        },
        {
          provide: CsvGenerator,
          useValue: csvGenerator,
        },
      ],
    }).compile();

    service = module.get<TransmissionASRetardService>(TransmissionASRetardService);
    masaProvider = module.get(MasaProvider);
  });

  it('should list STEU transmissions in retard', async () => {
    const mockData = {
      data: [
        {
          ouvrageDepollutionCode: 'ABC',
          ouvrageDepollutionNom: 'STEU 1',
          nbJoursRetard: 5,
          exploitantNom: 'Exploitant',
          exploitantEmail: 'a@b.c',
          exploitantDateEnvoiMail: '2026-01-01',
        },
      ],
      total: 1,
    };
    masaProvider.findTransmissionASRetardSteu.mockResolvedValue(mockData as any);
    masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
      { ouvrageDepollutionId: 1, ouvrageDepollutionCode: 'ABC' },
    ]);

    const result = await service.listTransmissionASRetardSteu({
      authorizedSteuCdas: ['ABC'],
      year: 2026,
      page: 1,
      pageSize: 10,
    });

    expect(result.data[0]).not.toHaveProperty('deposant');
    expect(result.total).toBe(1);
  });

  it('formats STEU export rows before generating csv', async () => {
    masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
      { ouvrageDepollutionId: 1, ouvrageDepollutionCode: 'ABC' },
    ]);
    masaProvider.findTransmissionASRetardSteu.mockResolvedValue({
      data: [
        {
          ouvrageDepollutionCode: 'ABC',
          ouvrageDepollutionNom: 'STEU 1',
          trancheObligationLibelle: '2000+',
          capaciteNominaleEH: 3200,
          nbFichiersAsRecus: 2,
          dateDernierFichierRecu: '2026-01-15',
          dateDebutPeriode: '2026-01-01',
          dateFinPeriode: '2026-01-31',
          dateMesureSuivanteAttendue: '2026-02-10',
          nbJoursRetard: 5,
        },
      ],
      total: 1,
    } as any);

    const result = await service.exportTransmissionASRetardSteuCsv({
      authorizedSteuCdas: ['ABC'],
      year: 2026,
      page: 1,
      pageSize: 10,
    });

    expect(result).toBe('csv-content');
    expect(csvGenerator.generate).toHaveBeenCalledWith(expect.any(Array), [
      {
        ouvrageDepollutionCode: 'ABC',
        ouvrageDepollutionNom: 'STEU 1',
        trancheObligationLibelle: '2000+',
        capaciteNominaleEH: '3200',
        nbFichiersAsRecus: '2',
        dateDernierFichierRecu: '15/01/2026',
        dateDebutPeriode: '01/01/2026',
        dateFinPeriode: '31/01/2026',
        dateMesureSuivanteAttendue: '10/02/2026',
        nbJoursRetard: '5 j',
      },
    ]);
  });
});
