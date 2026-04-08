import { Test, TestingModule } from '@nestjs/testing';
import { TransmissionASRetardService } from './transmissionASRetard.service';
import { MasaProvider } from '@masa/masa.provider';
import { TransmissionASRetardSteuDto, TransmissionASRetardSclDto } from '@lib/dossier';

describe('TransmissionASRetardService', () => {
  let service: TransmissionASRetardService;
  let masaProvider: jest.Mocked<MasaProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransmissionASRetardService,
        {
          provide: MasaProvider,
          useValue: {
            findTransmissionASRetardSteu: jest.fn(),
            findTransmissionASRetardScl: jest.fn(),
            findSteuBatchBySandreCdas: jest.fn(),
            findSclBatchBySandreCdas: jest.fn(),
          },
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
          codeSandre: 'ABC',
          nom: 'STEU 1',
          nbJoursRetard: 5,
          deposant: 'Dep',
          mail: 'a@b.c',
          dateMailExploitant: '2026-01-01',
        },
      ],
      total: 1,
    };
    masaProvider.findTransmissionASRetardSteu.mockResolvedValue(mockData as any);
    masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
      { ouvrageDepollutionIdentifiant: 1, ouvrageDepollutionCode: 'ABC' },
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
});
