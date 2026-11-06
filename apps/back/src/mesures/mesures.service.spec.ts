/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CsvGenerator } from '@shared/csv/csv.types';
import { MesuresService } from './mesures.service';
import { MasaProvider } from '@masa/masa.provider';
import type { MesureRow } from '@masa/masa.dto';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { EvenementService } from '../suivi-regulier/evenement/evenement.service';

const makeMesureRow = (): MesureRow => ({
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

const makeNomenclatureItem = (code: string, label: string) => ({
  elementNomenclatureCode: code,
  elementNomenclatureLibelle: label,
});

describe('MesuresService', () => {
  let service: MesuresService;
  let masaProvider: jest.Mocked<MasaProvider>;
  let csvGenerator: { generate: jest.Mock };
  let evenementService: {
    listEvenementSteu: jest.Mock;
    exportEvenementSteuCsv: jest.Mock;
    listEvenementScl: jest.Mock;
    exportEvenementSclCsv: jest.Mock;
    listEvenementTypes: jest.Mock;
    listAvailablePointsMesure: jest.Mock;
  };

  beforeEach(async () => {
    const mockMasaProvider: jest.Mocked<Partial<MasaProvider>> = {
      findMesures: jest.fn(),
      findSteuWithNamesBySandreCdas: jest.fn(),
      findSteuWithNamesBySandreCdasAndLabel: jest.fn(),
      findSclWithNamesBySandreCdas: jest.fn(),
      findSclWithNamesBySandreCdasAndLabel: jest.fn(),
      findPointsMesureByOuvrage: jest.fn(),
      findParametresByOuvrageAndPmo: jest.fn(),
      findFinalites: jest.fn(),
      findStatuts: jest.fn(),
      findQualifications: jest.fn(),
    };

    csvGenerator = { generate: jest.fn().mockReturnValue('csv-content') };
    evenementService = {
      listEvenementSteu: jest.fn(),
      exportEvenementSteuCsv: jest.fn(),
      listEvenementScl: jest.fn(),
      exportEvenementSclCsv: jest.fn(),
      listEvenementTypes: jest.fn(),
      listAvailablePointsMesure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MesuresService,
        PaginatedExportService,
        {
          provide: MasaProvider,
          useValue: mockMasaProvider,
        },
        {
          provide: CsvGenerator,
          useValue: csvGenerator,
        },
        {
          provide: EvenementService,
          useValue: evenementService,
        },
      ],
    }).compile();

    service = module.get<MesuresService>(MesuresService);
    masaProvider = module.get(MasaProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listMesures', () => {
    it('does not query any station when the requested code is empty', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: ['STEU001', 'STEU002'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: '',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('returns empty result when authorized STEUs is empty', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: [],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('queries only the requested STEU even when several STEUs are authorized', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001', 'STEU003'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({ ouvrageDepollutionCodes: ['STEU001'], systemeCollecteCodes: [] }),
      );
    });

    it('returns empty when the requested STEU is not in the authorized list', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: ['STEU999'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it.each(['steu', 'scl'] as const)('does not use rights for another ouvrage type (%s)', async (ouvrageType) => {
      const result = await service.listMesures({
        authorizedSteuCdas: ouvrageType === 'scl' ? ['CODE001'] : ['OTHER'],
        authorizedSclCdas: ouvrageType === 'steu' ? ['CODE001'] : ['OTHER'],
        ouvrageType,
        ouvrageCode: 'CODE001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('passes optional filters to findMesures', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        parametreCode: 'MES_CO',
        qualification: 'Brut',
        finalite: 'AUT',
        page: 2,
        pageSize: 10,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({
          dateDebut: '2024-01-01',
          dateFin: '2024-12-31',
          parametreAnalyseCode: 'MES_CO',
          resultatAnalyseQualification: 'Brut',
          analyseFinalite: 'AUT',
          page: 2,
          pageSize: 10,
        }),
      );
    });

    it('returns page metadata in response', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 42 });

      const result = await service.listMesures({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 3,
        pageSize: 10,
      });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(42);
    });

    it('routes to SCL authorization when ouvrageType is scl', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: ['SCL001', 'SCL002'],
        ouvrageType: 'scl',
        ouvrageCode: 'SCL001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({
          ouvrageType: 'scl',
          ouvrageDepollutionCodes: [],
          systemeCollecteCodes: ['SCL001'],
        }),
      );
    });

    it('returns empty result when authorized SCLs is empty', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: [],
        authorizedSclCdas: [],
        ouvrageType: 'scl',
        ouvrageCode: 'SCL001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('passes statut filter to masaProvider.findMesures when provided', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        statut: 'A',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(expect.objectContaining({ resultatAnalyseStatut: 'A' }));
    });

    it('passes qualification filter to masaProvider.findMesures when provided', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        qualification: '1',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({ resultatAnalyseQualification: '1' }),
      );
    });
  });

  describe('listOuvrages', () => {
    it('returns empty array when authorized STEUs is empty', async () => {
      const result = await service.listOuvrages([]);

      expect(result).toEqual([]);
      expect(masaProvider.findSteuWithNamesBySandreCdas).not.toHaveBeenCalled();
    });

    it('returns STEU list with names when authorized STEUs found', async () => {
      masaProvider.findSteuWithNamesBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionNom: 'Station A' },
        { ouvrageDepollutionCode: 'STEU002', ouvrageDepollutionNom: 'Station B' },
      ]);

      const result = await service.listOuvrages(['STEU001', 'STEU002']);

      expect(masaProvider.findSteuWithNamesBySandreCdas).toHaveBeenCalledWith(['STEU001', 'STEU002']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionNom: 'Station A' });
    });

    it('returns empty array when search has less than 2 characters', async () => {
      const result = await service.listOuvrages(['STEU001'], 's');

      expect(result).toEqual([]);
      expect(masaProvider.findSteuWithNamesBySandreCdasAndLabel).not.toHaveBeenCalled();
    });

    it('delegates to search when a search term is provided', async () => {
      masaProvider.findSteuWithNamesBySandreCdasAndLabel.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionNom: 'Station A' },
      ]);

      const result = await service.listOuvrages(['STEU001', 'STEU002'], 'sta');

      expect(masaProvider.findSteuWithNamesBySandreCdasAndLabel).toHaveBeenCalledWith(['STEU001', 'STEU002'], 'sta');
      expect(result).toEqual([{ ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionNom: 'Station A' }]);
    });
  });

  describe('getMesuresGraph', () => {
    it('scopes STEU events to the parent station of the selected SCL', async () => {
      masaProvider.findMesures.mockResolvedValue({
        data: [makeMesureRow()],
        total: 1,
      });
      evenementService.listEvenementSteu.mockResolvedValue({ data: [], total: 0 });

      await service.getMesuresGraph({
        authorizedSteuCdas: ['STEU001', 'STEU002'],
        authorizedSclCdas: ['SCL001', 'SCL002'],
        ouvrageType: 'scl',
        ouvrageCode: 'SCL001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({ ouvrageDepollutionCodes: [], systemeCollecteCodes: ['SCL001'] }),
      );
      expect(evenementService.listEvenementSteu).toHaveBeenCalledWith(
        expect.objectContaining({ ouvrageDepollutionCode: 'STEU001' }),
      );
    });

    it('does not query events when the selected ouvrage is unauthorized', async () => {
      const result = await service.getMesuresGraph({
        authorizedSteuCdas: ['STEU002'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual([]);
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
      expect(evenementService.listEvenementSteu).not.toHaveBeenCalled();
    });

    it('passes an exclusive upper-bound endDate to event filtering', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });
      evenementService.listEvenementSteu.mockResolvedValue({
        data: [
          {
            prisEnCompte: true,
            date: '2024-01-15',
            ouvrageDepollutionCode: 'STEU001',
            ouvrageDepollutionNom: 'Station test',
            typeEvenementCode: '1',
            typeEvenementLibelle: 'Incident',
            finalite: null,
            commentaire: 'Commentaire test',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 1000,
      });

      const result = await service.getMesuresGraph({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-01-31',
        page: 1,
        pageSize: 20,
      });

      expect(evenementService.listEvenementSteu).toHaveBeenCalledWith(
        expect.objectContaining({
          ouvrageDepollutionCode: 'STEU001',
          startDate: new Date('2024-01-01T00:00:00+01:00'),
          endDate: new Date('2024-02-01T00:00:00+01:00'),
        }),
      );
      expect(result[0]).toEqual(
        expect.objectContaining({
          typeEvenementCode: '1',
          typeEvenementLibelle: 'Incident',
          commentaire: 'Commentaire test',
        }),
      );
    });
  });

  describe('exportMesuresCsv', () => {
    it('formats rows before calling csv generator', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });

      const result = await service.exportMesuresCsv({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        ouvrageCode: 'STEU001',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        page: 1,
        pageSize: 20,
      });

      expect(result).toBe('csv-content');
      expect(csvGenerator.generate).toHaveBeenCalledWith(expect.any(Array), [
        {
          prelevementDate: '15/01/2024',
          pointMesure: 'Point 1 n°1',
          pointMesureLocalisationCode: '-',
          parametre: 'Matières en suspension',
          resultatAnalyseValeur: '12.5',
          uniteMesureSymbole: 'mg/L',
          resultatAnalyseQualification: 'Brut',
          analyseFinalite: '-',
          resultatAnalyseStatut: '-',
        },
      ]);
    });
  });

  describe('listSystemesCollecte', () => {
    it('returns empty array when authorized SCLs is empty', async () => {
      const result = await service.listSystemesCollecte([]);

      expect(result).toEqual([]);
      expect(masaProvider.findSclWithNamesBySandreCdas).not.toHaveBeenCalled();
    });

    it('returns SCL list with names when authorized SCLs found', async () => {
      masaProvider.findSclWithNamesBySandreCdas.mockResolvedValue([
        { systemeCollecteCode: 'SCL001', systemeCollecteNom: 'Réseau A' },
        { systemeCollecteCode: 'SCL002', systemeCollecteNom: 'Réseau B' },
      ]);

      const result = await service.listSystemesCollecte(['SCL001', 'SCL002']);

      expect(masaProvider.findSclWithNamesBySandreCdas).toHaveBeenCalledWith(['SCL001', 'SCL002']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ systemeCollecteCode: 'SCL001', systemeCollecteNom: 'Réseau A' });
    });

    it('returns empty array when search term is too short', async () => {
      const result = await service.listSystemesCollecte(['SCL001', 'SCL002'], 'r');

      expect(result).toEqual([]);
      expect(masaProvider.findSclWithNamesBySandreCdasAndLabel).not.toHaveBeenCalled();
    });

    it('delegates to searchSclWithNamesBySandreCdas when search is provided', async () => {
      masaProvider.findSclWithNamesBySandreCdasAndLabel.mockResolvedValue([
        { systemeCollecteCode: 'SCL001', systemeCollecteNom: 'Réseau A' },
      ]);

      const result = await service.listSystemesCollecte(['SCL001', 'SCL002'], 'rés');

      expect(masaProvider.findSclWithNamesBySandreCdasAndLabel).toHaveBeenCalledWith(['SCL001', 'SCL002'], 'rés');
      expect(result).toEqual([{ systemeCollecteCode: 'SCL001', systemeCollecteNom: 'Réseau A' }]);
    });
  });

  describe('listPointsMesure', () => {
    it('retourne les points de mesure avec la localisation globale quand l’ouvrage est autorisé', async () => {
      masaProvider.findPointsMesureByOuvrage.mockResolvedValue([
        {
          pointMesureId: 120,
          pointMesureNumero: '120',
          pointMesureLibelle: 'DO entrée station',
          pointMesureLocalisationGlobale: 'A3',
        },
      ]);

      const result = await service.listPointsMesure(['STEU001'], [], 'steu', 'STEU001');

      expect(masaProvider.findPointsMesureByOuvrage).toHaveBeenCalledWith('steu', 'STEU001', undefined);
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
    it('delegates with omitted pmoCdn when ouvrage is authorized', async () => {
      masaProvider.findParametresByOuvrageAndPmo.mockResolvedValue([
        {
          parametreAnalyseCode: 'DBO5',
          parametreNomCourt: 'Demande biochimique en oxygène sur 5 jours',
        },
      ]);

      const result = await service.listParametresMesure(['STEU001'], [], 'steu', 'STEU001');

      expect(masaProvider.findParametresByOuvrageAndPmo).toHaveBeenCalledWith('steu', 'STEU001', undefined);
      expect(result).toEqual([
        {
          parametreAnalyseCode: 'DBO5',
          parametreNomCourt: 'Demande biochimique en oxygène sur 5 jours',
        },
      ]);
    });
  });

  describe('listStatuts', () => {
    it('delegates to masaProvider.findStatuts', async () => {
      const items = [makeNomenclatureItem('A', 'Donnée brute'), makeNomenclatureItem('B', 'Pré-qualification')];
      masaProvider.findStatuts.mockResolvedValue(items);

      const result = await service.listStatuts();

      expect(masaProvider.findStatuts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(items);
    });
  });

  describe('listQualifications', () => {
    it('delegates to masaProvider.findQualifications', async () => {
      const items = [makeNomenclatureItem('1', 'Correcte'), makeNomenclatureItem('2', 'Incorrecte')];
      masaProvider.findQualifications.mockResolvedValue(items);

      const result = await service.listQualifications();

      expect(masaProvider.findQualifications).toHaveBeenCalledTimes(1);
      expect(result).toEqual(items);
    });
  });
});
