/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { MesuresController } from './mesures.controller';
import { MesuresService } from './mesures.service';
import { MeGuard } from '@authentication/me.guard';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { PaginatedMesuresResponse } from '../../../../packages/dossier/src/mesure/mesure.dto';

const makeMesureDto: () => PaginatedMesuresResponse['data'][0] = () => ({
  ouvrageDepollutionCode: 'STEU001',
  ouvrageDepollutionNom: 'Station test',
  systemeCollecteCode: null,
  systemeCollecteNom: null,
  pointMesureLocalisationCode: null,
  pointAgenceEauNumero: null,
  pointMesureNumero: '1',
  pointMesureLibelle: 'Point 1',
  prelevementDate: new Date('2024-01-15'),
  parametreAnalyseCode: 'MES_CO',
  parametreNomCourt: 'Matières en suspension',
  resultatAnalyseValeur: 12.5,
  uniteMesureSymbole: 'mg/L',
  analyseFinalite: null,
  resultatAnalyseStatut: null,
  resultatAnalyseQualification: 'Brut',
});

describe('MesuresController', () => {
  let controller: MesuresController;
  let mesuresService: jest.Mocked<MesuresService>;

  beforeEach(async () => {
    const mockMesuresService: jest.Mocked<Partial<MesuresService>> = {
      listMesures: jest.fn(),
      listOuvrages: jest.fn(),
      listPointsMesure: jest.fn(),
      listParametresMesure: jest.fn(),
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
      const paginated: PaginatedMesuresResponse = { data: [makeMesureDto()], total: 1, page: 1, pageSize: 20 };
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
          ouvrageDepollutionCodes: ['STEU001'],
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

  describe('getMesuresGraph', () => {
    it('delegates graph query filters to service', async () => {
      mesuresService.getMesuresGraph = jest.fn().mockResolvedValue([]);

      const result = await controller.getMesuresGraph(makeRequest(['STEU001'], []), {
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

      expect(mesuresService.getMesuresGraph).toHaveBeenCalledWith(
        expect.objectContaining({
          authorizedSteuCdas: ['STEU001'],
          ouvrageDepollutionCodes: ['STEU001'],
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
      expect(result).toEqual([]);
    });
  });

  describe('listOuvrages', () => {
    it('delegates to service with authorized STEU codes from request', async () => {
      const ouvrages = [{ ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionNom: 'Station A' }];
      mesuresService.listOuvrages.mockResolvedValue(ouvrages);

      const result = await controller.listOuvrages(makeRequest(['STEU001'], []), {});

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith(['STEU001'], undefined);
      expect(result).toEqual(ouvrages);
    });

    it('delegates with empty STEU list', async () => {
      mesuresService.listOuvrages.mockResolvedValue([]);

      const result = await controller.listOuvrages(makeRequest([], []), {});

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith([], undefined);
      expect(result).toEqual([]);
    });

    it('passes search query to service', async () => {
      mesuresService.listOuvrages.mockResolvedValue([]);

      await controller.listOuvrages(makeRequest(['STEU001'], []), { search: 'sta' });

      expect(mesuresService.listOuvrages).toHaveBeenCalledWith(['STEU001'], 'sta');
    });
  });

  describe('listPointsMesure', () => {
    it('traduit le type de point en filtres de localisation avant délégation au service', async () => {
      mesuresService.listPointsMesure.mockResolvedValue([
        {
          pointMesureId: 120,
          pointMesureNumero: '120',
          pointMesureLibelle: 'DO entrée station',
          pointMesureLocalisationGlobale: 'A3',
        },
      ]);

      const result = await controller.listPointsMesure(makeRequest(['STEU001'], []), {
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        typePoint: 'reglementaire',
      });

      expect(mesuresService.listPointsMesure).toHaveBeenCalledWith(
        ['STEU001'],
        [],
        'steu',
        'STEU001',
        expect.objectContaining({ localisationCodes: expect.arrayContaining(['A1', 'A3', 'A8']) }),
      );
      expect(result).toEqual([
        {
          pointMesureId: 120,
          pointMesureNumero: '120',
          pointMesureLibelle: 'DO entrée station',
          pointMesureLocalisationGlobale: 'A3',
        },
      ]);
    });
  });

  describe('listParametresMesure', () => {
    it('delegates with omitted pmoCdn', async () => {
      mesuresService.listParametresMesure.mockResolvedValue([
        {
          parametreAnalyseCode: 'DBO5',
          parametreNomCourt: 'Demande biochimique en oxygène sur 5 jours',
        },
      ]);

      const result = await controller.listParametresMesure(makeRequest(['STEU001'], []), {
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
      });

      expect(mesuresService.listParametresMesure).toHaveBeenCalledWith(['STEU001'], [], 'steu', 'STEU001', undefined);
      expect(result).toEqual([
        {
          parametreAnalyseCode: 'DBO5',
          parametreNomCourt: 'Demande biochimique en oxygène sur 5 jours',
        },
      ]);
    });
  });
});
