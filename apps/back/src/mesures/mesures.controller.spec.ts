/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MesuresController } from './mesures.controller';
import { MesuresService } from './mesures.service';
import { MeGuard } from '@authentication/me.guard';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import type { CustomRequest } from '@shared/constants/customRequest';

const makeMesureDto = () => ({
  steuSandreCda: 'STEU001',
  steuNom: 'Station test',
  sclSandreCda: null,
  sclNom: null,
  localisationPoint: null,
  numPointAgence: null,
  numPoint: '1',
  nomPoint: 'Point 1',
  date: new Date('2024-01-15'),
  parametreCode: 'MES_CO',
  parametreNom: 'Matières en suspension',
  valeur: 12.5,
  unite: 'mg/L',
  finalite: null,
  statut: null,
  qualification: 'Brut',
});

describe('MesuresController', () => {
  let controller: MesuresController;
  let mesuresService: jest.Mocked<MesuresService>;

  beforeEach(async () => {
    const mockMesuresService: jest.Mocked<Partial<MesuresService>> = {
      listMesures: jest.fn(),
      listOuvrages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MesuresController],
      providers: [
        {
          provide: MesuresService,
          useValue: mockMesuresService,
        },
      ],
    })
      .overrideGuard(MeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(HasUserAccessToOuvragesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MesuresController>(MesuresController);
    mesuresService = module.get(MesuresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = (authorizedSteuCdas: string[] = ['STEU001'], authorizedSclCdas: string[] = []): CustomRequest =>
    ({
      user: { itvCdn: 42, isExpertNational: false, cerbereId: 'test', mel: 'test@example.com' },
      authorizedSteuCdas,
      authorizedSclCdas,
    }) as unknown as CustomRequest;

  describe('listMesures', () => {
    it('delegates to service with authorized codes from request', async () => {
      const paginated = { data: [makeMesureDto()], total: 1, page: 1, pageSize: 20 };
      mesuresService.listMesures.mockResolvedValue(paginated);

      const result = await controller.listMesures(makeRequest(['STEU001'], []), {
        page: 1,
        pageSize: 20,
        ouvrageType: 'steu',
      });

      expect(mesuresService.listMesures).toHaveBeenCalledWith(
        expect.objectContaining({ authorizedSteuCdas: ['STEU001'], authorizedSclCdas: [], page: 1, pageSize: 20 }),
      );
      expect(result).toEqual(paginated);
    });

    it('passes all optional filters to service', async () => {
      mesuresService.listMesures.mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 10 });

      await controller.listMesures(makeRequest(['STEU001'], []), {
        steuSandreCdas: ['STEU001'],
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        parametreCode: 'MES_CO',
        qualification: 'Brut',
        finalite: 'AUT',
        page: 2,
        pageSize: 10,
        sortBy: 'date',
        sortOrder: 'DESC',
        ouvrageType: 'steu',
      });

      expect(mesuresService.listMesures).toHaveBeenCalledWith(
        expect.objectContaining({
          authorizedSteuCdas: ['STEU001'],
          steuSandreCdas: ['STEU001'],
          dateDebut: '2024-01-01',
          dateFin: '2024-12-31',
          parametreCode: 'MES_CO',
          qualification: 'Brut',
          finalite: 'AUT',
          page: 2,
          pageSize: 10,
          sortBy: 'date',
          sortOrder: 'DESC',
        }),
      );
    });
  });

  describe('listOuvrages', () => {
    it('delegates to service with authorized STEU codes from request', async () => {
      const ouvrages = [{ steuSandreCda: 'STEU001', steuNom: 'Station A' }];
      mesuresService.listOuvrages.mockResolvedValue(ouvrages);

      const result = await controller.listOuvrages(makeRequest(['STEU001'], []));

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith(['STEU001']);
      expect(result).toEqual(ouvrages);
    });

    it('delegates with empty STEU list', async () => {
      mesuresService.listOuvrages.mockResolvedValue([]);

      const result = await controller.listOuvrages(makeRequest([], []));

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
