import { Test, TestingModule } from '@nestjs/testing';
import { MasaProvider } from '@masa/masa.provider';
import { EvenementService } from './evenement.service';

describe('EvenementService', () => {
  let service: EvenementService;
  let masaProviderMock: Partial<MasaProvider>;

  beforeEach(async () => {
    masaProviderMock = {
      findEvenementSteu: jest.fn(),
      findSteuBatchBySandreCdas: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvenementService,
        {
          provide: MasaProvider,
          useValue: masaProviderMock,
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
      pointMesureId: 45,
      page: 1,
      pageSize: 10,
    });
  });
});
