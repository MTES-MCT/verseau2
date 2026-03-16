/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MesuresController } from './mesures.controller';
import { MesuresService } from './mesures.service';
import { MeGuard } from '@authentication/me.guard';
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
      .compile();

    controller = module.get<MesuresController>(MesuresController);
    mesuresService = module.get(MesuresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = (itvCdn: number | null): CustomRequest =>
    ({
      user: { itvCdn, isExpertNational: false, cerbereId: 'test', mel: 'test@example.com' },
    }) as unknown as CustomRequest;

  describe('listMesures', () => {
    it('delegates to service with itvCdn from request user', async () => {
      const paginated = { data: [makeMesureDto()], total: 1, page: 1, pageSize: 20 };
      mesuresService.listMesures.mockResolvedValue(paginated);

      const result = await controller.listMesures(makeRequest(42), {
        page: 1,
        pageSize: 20,
        ouvrageType: 'steu',
      });

      expect(mesuresService.listMesures).toHaveBeenCalledWith(
        expect.objectContaining({ itvCdn: 42, page: 1, pageSize: 20 }),
      );
      expect(result).toEqual(paginated);
    });

    it('passes all optional filters to service', async () => {
      mesuresService.listMesures.mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 10 });

      await controller.listMesures(makeRequest(42), {
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
          itvCdn: 42,
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

    it('works with null itvCdn', async () => {
      mesuresService.listMesures.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

      await controller.listMesures(makeRequest(null), { page: 1, pageSize: 20, ouvrageType: 'steu' });

      expect(mesuresService.listMesures).toHaveBeenCalledWith(expect.objectContaining({ itvCdn: null }));
    });
  });

  describe('listOuvrages', () => {
    it('delegates to service with itvCdn from request user', async () => {
      const ouvrages = [{ steuSandreCda: 'STEU001', steuNom: 'Station A' }];
      mesuresService.listOuvrages.mockResolvedValue(ouvrages);

      const result = await controller.listOuvrages(makeRequest(42));

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith(42);
      expect(result).toEqual(ouvrages);
    });

    it('works with null itvCdn', async () => {
      mesuresService.listOuvrages.mockResolvedValue([]);

      const result = await controller.listOuvrages(makeRequest(null));

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith(null);
      expect(result).toEqual([]);
    });
  });
});
