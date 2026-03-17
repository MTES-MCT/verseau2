/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MesuresService } from './mesures.service';
import { MasaProvider } from '@masa/masa.provider';
import type { MesureRow } from '@masa/masa.dto';

const makeMesureRow = (): MesureRow => ({
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

const makeNomenclatureItem = (code: string, label: string) => ({ code, label });

describe('MesuresService', () => {
  let service: MesuresService;
  let masaProvider: jest.Mocked<MasaProvider>;

  beforeEach(async () => {
    const mockMasaProvider: jest.Mocked<Partial<MasaProvider>> = {
      findMesures: jest.fn(),
      findSteuWithNamesBySandreCdas: jest.fn(),
      findSclWithNamesBySandreCdas: jest.fn(),
      findPointsMesureByOuvrage: jest.fn(),
      findParametresByOuvrageAndPmo: jest.fn(),
      findFinalites: jest.fn(),
      findStatuts: jest.fn(),
      findQualifications: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MesuresService,
        {
          provide: MasaProvider,
          useValue: mockMasaProvider,
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
    it('calls findMesures with all authorized STEUs when no filter given', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });

      const result = await service.listMesures({
        authorizedSteuCdas: ['STEU001', 'STEU002'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({ steuSandreCdas: ['STEU001', 'STEU002'], ouvrageType: 'steu' }),
      );
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('returns empty result when authorized STEUs is empty', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: [],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('intersects requested STEUs with authorized STEUs', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001', 'STEU003'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        steuSandreCdas: ['STEU001', 'STEU002'],
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(expect.objectContaining({ steuSandreCdas: ['STEU001'] }));
    });

    it('returns empty when requested STEUs are not in authorized list', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: ['STEU999'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        steuSandreCdas: ['STEU001', 'STEU002'],
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
          parametreCode: 'MES_CO',
          qualification: 'Brut',
          finalite: 'AUT',
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
        authorizedSteuCdas: [],
        authorizedSclCdas: ['SCL001'],
        ouvrageType: 'scl',
        sclSandreCdas: ['SCL001'],
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({ ouvrageType: 'scl', sclSandreCdas: ['SCL001'] }),
      );
    });

    it('returns empty result when authorized SCLs is empty', async () => {
      const result = await service.listMesures({
        authorizedSteuCdas: [],
        authorizedSclCdas: [],
        ouvrageType: 'scl',
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
        statut: 'A',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(expect.objectContaining({ statut: 'A' }));
    });

    it('passes qualification filter to masaProvider.findMesures when provided', async () => {
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });

      await service.listMesures({
        authorizedSteuCdas: ['STEU001'],
        authorizedSclCdas: [],
        ouvrageType: 'steu',
        qualification: '1',
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(expect.objectContaining({ qualification: '1' }));
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
        { steuSandreCda: 'STEU001', steuNom: 'Station A' },
        { steuSandreCda: 'STEU002', steuNom: 'Station B' },
      ]);

      const result = await service.listOuvrages(['STEU001', 'STEU002']);

      expect(masaProvider.findSteuWithNamesBySandreCdas).toHaveBeenCalledWith(['STEU001', 'STEU002']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ steuSandreCda: 'STEU001', steuNom: 'Station A' });
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
        { sclSandreCda: 'SCL001', sclNom: 'Réseau A' },
        { sclSandreCda: 'SCL002', sclNom: 'Réseau B' },
      ]);

      const result = await service.listSystemesCollecte(['SCL001', 'SCL002']);

      expect(masaProvider.findSclWithNamesBySandreCdas).toHaveBeenCalledWith(['SCL001', 'SCL002']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ sclSandreCda: 'SCL001', sclNom: 'Réseau A' });
    });
  });

  describe('listStatuts', () => {
    it('delegates to masaProvider.findStatuts', async () => {
      const items = [makeNomenclatureItem('A', 'Donnée brute'), makeNomenclatureItem('B', 'Pré-qualification')];
      masaProvider.findStatuts!.mockResolvedValue(items);

      const result = await service.listStatuts();

      expect(masaProvider.findStatuts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(items);
    });
  });

  describe('listQualifications', () => {
    it('delegates to masaProvider.findQualifications', async () => {
      const items = [makeNomenclatureItem('1', 'Correcte'), makeNomenclatureItem('2', 'Incorrecte')];
      masaProvider.findQualifications!.mockResolvedValue(items);

      const result = await service.listQualifications();

      expect(masaProvider.findQualifications).toHaveBeenCalledTimes(1);
      expect(result).toEqual(items);
    });
  });
});
