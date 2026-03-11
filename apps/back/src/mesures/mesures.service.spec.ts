/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MesuresService } from './mesures.service';
import { MasaProvider } from '@masa/masa.provider';
import type { IntervenantAuth, VSteuSclItvResult, MesureRow } from '@masa/masa.dto';

const makeIntervenant = (itvCdn: number, itvRfa: string): IntervenantAuth => ({
  itvCdn,
  itvRfa,
});

const makeVSteuSclItv = (steuCda: string): VSteuSclItvResult => ({
  steuCda,
  sclCda: 'SCL001',
  moItvRfa: null,
  satItvRfa: null,
  aeItvRfa: null,
});

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

describe('MesuresService', () => {
  let service: MesuresService;
  let masaProvider: jest.Mocked<MasaProvider>;

  beforeEach(async () => {
    const mockMasaProvider: jest.Mocked<Partial<MasaProvider>> = {
      findIntervenantById: jest.fn(),
      findVSteuSclItvByItvRfa: jest.fn(),
      findMesures: jest.fn(),
      findSteuWithNamesBySandreCdas: jest.fn(),
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
    it('returns empty result when itvCdn is null', async () => {
      const result = await service.listMesures({ itvCdn: null, page: 1, pageSize: 20 });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findIntervenantById).not.toHaveBeenCalled();
    });

    it('returns empty result when intervenant is not found', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(null as unknown as IntervenantAuth);

      const result = await service.listMesures({ itvCdn: 42, page: 1, pageSize: 20 });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('returns empty result when intervenant has no itvRfa', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, ''));

      const result = await service.listMesures({ itvCdn: 42, page: 1, pageSize: 20 });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('returns empty result when no STEUs are authorized', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([]);

      const result = await service.listMesures({ itvCdn: 42, page: 1, pageSize: 20 });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('calls findMesures with all authorized STEUs when no filter given', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU001'), makeVSteuSclItv('STEU002')]);
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 1 });

      const result = await service.listMesures({ itvCdn: 42, page: 1, pageSize: 20 });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(
        expect.objectContaining({ steuSandreCdas: ['STEU001', 'STEU002'] }),
      );
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('intersects requested STEUs with authorized STEUs', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU001'), makeVSteuSclItv('STEU003')]);
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({ itvCdn: 42, steuSandreCdas: ['STEU001', 'STEU002'], page: 1, pageSize: 20 });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(expect.objectContaining({ steuSandreCdas: ['STEU001'] }));
    });

    it('returns empty when requested STEUs are not in authorized list', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU999')]);

      const result = await service.listMesures({
        itvCdn: 42,
        steuSandreCdas: ['STEU001', 'STEU002'],
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findMesures).not.toHaveBeenCalled();
    });

    it('deduplicates STEU cdas from VSteuSclItv results', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        makeVSteuSclItv('STEU001'),
        makeVSteuSclItv('STEU001'), // duplicate
      ]);
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({ itvCdn: 42, page: 1, pageSize: 20 });

      expect(masaProvider.findMesures).toHaveBeenCalledWith(expect.objectContaining({ steuSandreCdas: ['STEU001'] }));
    });

    it('passes optional filters to findMesures', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU001')]);
      masaProvider.findMesures.mockResolvedValue({ data: [], total: 0 });

      await service.listMesures({
        itvCdn: 42,
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
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU001')]);
      masaProvider.findMesures.mockResolvedValue({ data: [makeMesureRow()], total: 42 });

      const result = await service.listMesures({ itvCdn: 42, page: 3, pageSize: 10 });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(42);
    });
  });

  describe('listOuvrages', () => {
    it('returns empty array when itvCdn is null', async () => {
      const result = await service.listOuvrages(null);

      expect(result).toEqual([]);
      expect(masaProvider.findIntervenantById).not.toHaveBeenCalled();
    });

    it('returns empty array when intervenant has no itvRfa', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, ''));

      const result = await service.listOuvrages(42);

      expect(result).toEqual([]);
      expect(masaProvider.findSteuWithNamesBySandreCdas).not.toHaveBeenCalled();
    });

    it('returns empty array when no STEUs found', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([]);

      const result = await service.listOuvrages(42);

      expect(result).toEqual([]);
    });

    it('returns STEU list with names when authorized STEUs found', async () => {
      masaProvider.findIntervenantById.mockResolvedValue(makeIntervenant(42, 'SIRET001'));
      masaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([makeVSteuSclItv('STEU001'), makeVSteuSclItv('STEU002')]);
      masaProvider.findSteuWithNamesBySandreCdas.mockResolvedValue([
        { steuSandreCda: 'STEU001', steuNom: 'Station A' },
        { steuSandreCda: 'STEU002', steuNom: 'Station B' },
      ]);

      const result = await service.listOuvrages(42);

      expect(masaProvider.findSteuWithNamesBySandreCdas).toHaveBeenCalledWith(['STEU001', 'STEU002']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ steuSandreCda: 'STEU001', steuNom: 'Station A' });
    });
  });
});
