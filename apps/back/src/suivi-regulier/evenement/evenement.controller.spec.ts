import { Test, TestingModule } from '@nestjs/testing';
import type { CustomRequest } from '@shared/constants/customRequest';
import { MeGuard } from '@authentication/me.guard';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { EvenementController } from './evenement.controller';
import { EvenementService } from './evenement.service';

describe('EvenementController', () => {
  let controller: EvenementController;
  const evenementService = {
    listEvenementSteu: jest.fn(),
    exportEvenementSteuCsv: jest.fn(),
    listEvenementScl: jest.fn(),
    exportEvenementSclCsv: jest.fn(),
    listEvenementTypes: jest.fn(),
    listAvailablePointsMesure: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvenementController],
      providers: [
        {
          provide: EvenementService,
          useValue: evenementService,
        },
      ],
    })
      .overrideGuard(MeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(HasUserAccessToOuvragesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EvenementController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = (): CustomRequest =>
    ({
      user: { itvCdn: 42, isExpertNational: false, cerbereId: 'test', mel: 'test@example.com' },
      authorizedSteuCdas: ['STEU001'],
      authorizedSclCdas: [],
    }) as unknown as CustomRequest;

  it('omits year when listing STEU events', async () => {
    evenementService.listEvenementSteu.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

    await controller.listEvenementSteu(makeRequest(), {
      year: 2024,
      typeEvenementCode: '1',
      ouvrageDepollutionCode: 'STEU001',
      pointMesureId: 123,
      page: 1,
      pageSize: 20,
    });

    expect(evenementService.listEvenementSteu).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedSteuCdas: ['STEU001'],
        typeEvenementCode: '1',
        ouvrageDepollutionCode: 'STEU001',
        pointMesureId: 123,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );
    expect(evenementService.listEvenementSteu).not.toHaveBeenCalledWith(expect.objectContaining({ year: 2024 }));
  });

  it('omits year when exporting STEU events', async () => {
    evenementService.exportEvenementSteuCsv.mockResolvedValue('csv');
    const res = { set: jest.fn(), send: jest.fn() } as never;

    await controller.exportEvenementSteu(
      makeRequest(),
      {
        year: 2024,
        typeEvenementCode: '1',
        ouvrageDepollutionCode: 'STEU001',
        pointMesureId: 123,
        page: 1,
        pageSize: 20,
      },
      res,
    );

    expect(evenementService.exportEvenementSteuCsv).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedSteuCdas: ['STEU001'],
        typeEvenementCode: '1',
        ouvrageDepollutionCode: 'STEU001',
        pointMesureId: 123,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );
    expect(evenementService.exportEvenementSteuCsv).not.toHaveBeenCalledWith(expect.objectContaining({ year: 2024 }));
  });
});
