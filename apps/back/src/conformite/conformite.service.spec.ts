/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@shared/logger/traceCalls.decorator', () => ({
  TraceCalls:
    () =>
    (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor =>
      descriptor,
}));

import { ConformiteService } from './conformite.service';
import { MasaProvider } from '@masa/masa.provider';
import type {
  ConformiteSclDetailRow,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSteuRow,
} from '@masa/masa.dto';
import { SclEntity } from '@referentiel/roseau/entities/scl.entity';
import { LoggerService } from '@shared/logger/logger.service';

const makeConformiteSteuRow = (): ConformiteSteuRow => ({
  ouvrageDepollutionCode: 'STEU001',
  ouvrageDepollutionNom: 'Station test',
  trancheObligationLibelle: '2000 à 9999 EH',
  capaciteNominaleEH: 5000,
  suiviDebutDate: '2024-01-01',
  suiviFinDate: '2024-12-31',
  conformiteNationaleProvisoire: 'Conforme',
  conformiteLocaleProvisoire: 'Conforme',
  impactConformite: true,
  suiviRegulierEffectue: true,
  suiviRegulierDate: '2024-06-15',
});

const makeConformiteSclRow = (): ConformiteSclRow => ({
  systemeCollecteCode: 'SCL001',
  systemeCollecteNom: 'Réseau test',
  trancheObligationLibelle: '2000 à 9999 EH',
  typeScl: 'Unitaire',
  suiviDebutDate: '2024-01-01',
  suiviFinDate: '2024-12-31',
  conformiteLocaleTempsPluieProvisoire: 'Conforme',
  conformiteNationaleTempsPluieProvisoire: 'Non conforme',
  impactConformite: false,
  suiviRegulierEffectue: true,
  suiviRegulierDate: '2024-07-01',
});

const makeConformiteSteuDetailRow = (): ConformiteSteuDetailRow => ({
  conformiteLocaleParametresConformesPeriodeNb: 1,
  conformiteLocaleParametresConformesAnneeNb: 2,
  conformiteLocaleParametresNonConformesPeriodeNb: 3,
  conformiteLocaleParametresNonConformesAnneeNb: 4,
  conformiteLocaleRedhibitoiresPeriodeNb: 5,
  conformiteLocaleRedhibitoiresAnneeNb: 6,
  conformiteLocaleParametresConformesPeriodeLb: 'A',
  conformiteLocaleParametresConformesAnneeLb: 'B',
  conformiteLocaleParametresNonConformesPeriodeLb: 'C',
  conformiteLocaleParametresNonConformesAnneeLb: 'D',
  conformiteLocaleRedhibitoiresPeriodeLb: 'E',
  conformiteLocaleRedhibitoiresAnneeLb: 'F',
  conformiteNationaleParametresConformesPeriodeNb: 7,
  conformiteNationaleParametresConformesAnneeNb: 8,
  conformiteNationaleParametresNonConformesPeriodeNb: 9,
  conformiteNationaleParametresNonConformesAnneeNb: 10,
  conformiteNationaleRedhibitoiresPeriodeNb: 11,
  conformiteNationaleRedhibitoiresAnneeNb: 12,
  conformiteNationaleParametresConformesPeriodeLb: 'G',
  conformiteNationaleParametresConformesAnneeLb: 'H',
  conformiteNationaleParametresNonConformesPeriodeLb: 'I',
  conformiteNationaleParametresNonConformesAnneeLb: 'J',
  conformiteNationaleRedhibitoiresPeriodeLb: 'K',
  conformiteNationaleRedhibitoiresAnneeLb: 'L',
  hcnfPeriodeNb: 13,
  hcnfAnneeNb: 14,
  hctsPeriodeNb: 15,
  hctsAnneeNb: 16,
  hcnfPeriodeLb: 'M',
  hcnfAnneeLb: 'N',
  hctsPeriodeLb: 'O',
  hctsAnneeLb: 'P',
  evenementsPeriodeNb: 17,
  evenementsAnneeNb: 18,
});

const makeConformiteSclDetailRow = (): ConformiteSclDetailRow => ({
  volumeDeversePeriodePc: 1,
  volumeDeverseAnneePc: 2,
  conformiteVolumePeriode: 'Conforme',
  conformiteVolumeAnnee: 'Non conforme',
  fluxDeversePeriodePc: 3,
  fluxDeverseAnneePc: 4,
  conformiteFluxPeriode: 'Conforme',
  conformiteFluxAnnee: 'Non conforme',
  joursDeversementPeriodeNb: 5,
  joursDeversementAnneeNb: 6,
  conformiteJoursDeversementPeriode: 'Conforme',
  conformiteJoursDeversementAnnee: 'Non conforme',
});

const makeSclEntity = (sclCdn: number): SclEntity => ({ sclCdn }) as SclEntity;

describe('ConformiteService', () => {
  let service: ConformiteService;
  let masaProvider: jest.Mocked<MasaProvider>;
  let logger: { warn: jest.Mock; setContext: jest.Mock };

  beforeEach(async () => {
    const mockMasaProvider: jest.Mocked<Partial<MasaProvider>> = {
      findSteuBatchBySandreCdas: jest.fn(),
      findConformiteSteu: jest.fn(),
      findConformiteScl: jest.fn(),
      findConformiteSteuDetail: jest.fn(),
      findConformiteSclDetail: jest.fn(),
      findSclBySandreCda: jest.fn(),
    };

    logger = {
      warn: jest.fn(),
      setContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConformiteService,
        {
          provide: MasaProvider,
          useValue: mockMasaProvider,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<ConformiteService>(ConformiteService);
    masaProvider = module.get(MasaProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listConformiteSteu', () => {
    it('calls findSteuBatchBySandreCdas then findConformiteSteu with resolved CDNs', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
        { ouvrageDepollutionCode: 'STEU002', ouvrageDepollutionIdentifiant: 202 },
      ]);
      masaProvider.findConformiteSteu.mockResolvedValue({ data: [makeConformiteSteuRow()], total: 1 });

      const result = await service.listConformiteSteu({
        authorizedSteuCdas: ['STEU001', 'STEU002'],
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findSteuBatchBySandreCdas).toHaveBeenCalledWith(['STEU001', 'STEU002']);
      expect(masaProvider.findConformiteSteu).toHaveBeenCalledWith(
        expect.objectContaining({ steuCdns: [101, 202], page: 1, pageSize: 20 }),
      );
      expect(result).toEqual({ data: [makeConformiteSteuRow()], total: 1, page: 1, pageSize: 20 });
    });

    it('returns empty result when authorizedSteuCdas is empty', async () => {
      const result = await service.listConformiteSteu({
        authorizedSteuCdas: [],
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findSteuBatchBySandreCdas).not.toHaveBeenCalled();
      expect(masaProvider.findConformiteSteu).not.toHaveBeenCalled();
    });

    it('returns empty result when no CDN is resolved', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([]);

      const result = await service.listConformiteSteu({
        authorizedSteuCdas: ['STEU001'],
        page: 2,
        pageSize: 10,
      });

      expect(result).toEqual({ data: [], total: 0, page: 2, pageSize: 10 });
      expect(masaProvider.findConformiteSteu).not.toHaveBeenCalled();
    });

    it('passes optional filters and pagination to masaProvider', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);
      masaProvider.findConformiteSteu.mockResolvedValue({ data: [], total: 0 });

      await service.listConformiteSteu({
        authorizedSteuCdas: ['STEU001'],
        trancheObligationLibelle: '2000 à 9999 EH',
        impact: 'avec',
        sortBy: 'ouvrageDepollutionCode',
        sortOrder: 'DESC',
        page: 3,
        pageSize: 5,
      });

      expect(masaProvider.findConformiteSteu).toHaveBeenCalledWith(
        expect.objectContaining({
          steuCdns: [101],
          trancheObligationLibelle: '2000 à 9999 EH',
          impact: 'avec',
          sortBy: 'ouvrageDepollutionCode',
          sortOrder: 'DESC',
          page: 3,
          pageSize: 5,
        }),
      );
    });

    it('returns pagination metadata from list response', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);
      masaProvider.findConformiteSteu.mockResolvedValue({ data: [makeConformiteSteuRow()], total: 42 });

      const result = await service.listConformiteSteu({
        authorizedSteuCdas: ['STEU001'],
        page: 4,
        pageSize: 15,
      });

      expect(result.page).toBe(4);
      expect(result.pageSize).toBe(15);
      expect(result.total).toBe(42);
    });
  });

  describe('listConformiteScl', () => {
    it('uses authorized STEU CDNs to filter SCL results', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);
      masaProvider.findConformiteScl.mockResolvedValue({ data: [makeConformiteSclRow()], total: 1 });

      const result = await service.listConformiteScl({
        authorizedSteuCdas: ['STEU001'],
        page: 1,
        pageSize: 20,
      });

      expect(masaProvider.findSteuBatchBySandreCdas).toHaveBeenCalledWith(['STEU001']);
      expect(masaProvider.findConformiteScl).toHaveBeenCalledWith(
        expect.objectContaining({ steuCdns: [101], page: 1, pageSize: 20 }),
      );
      expect(result).toEqual({ data: [makeConformiteSclRow()], total: 1, page: 1, pageSize: 20 });
    });

    it('returns empty result when no ouvrage is authorized', async () => {
      const result = await service.listConformiteScl({
        authorizedSteuCdas: [],
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
      expect(masaProvider.findSteuBatchBySandreCdas).not.toHaveBeenCalled();
      expect(masaProvider.findConformiteScl).not.toHaveBeenCalled();
    });

    it('returns empty result when no STEU CDN is resolved for SCL filtering', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([]);

      const result = await service.listConformiteScl({
        authorizedSteuCdas: ['STEU001'],
        page: 2,
        pageSize: 25,
      });

      expect(result).toEqual({ data: [], total: 0, page: 2, pageSize: 25 });
      expect(masaProvider.findConformiteScl).not.toHaveBeenCalled();
    });

    it('passes optional filters to masaProvider for SCL listing', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);
      masaProvider.findConformiteScl.mockResolvedValue({ data: [], total: 0 });

      await service.listConformiteScl({
        authorizedSteuCdas: ['STEU001'],
        trancheObligationLibelle: '2000 à 9999 EH',
        impact: 'sans',
        sortBy: 'systemeCollecteCode',
        sortOrder: 'ASC',
        page: 5,
        pageSize: 30,
      });

      expect(masaProvider.findConformiteScl).toHaveBeenCalledWith(
        expect.objectContaining({
          steuCdns: [101],
          trancheObligationLibelle: '2000 à 9999 EH',
          impact: 'sans',
          sortBy: 'systemeCollecteCode',
          sortOrder: 'ASC',
          page: 5,
          pageSize: 30,
        }),
      );
    });
  });

  describe('getConformiteSteuDetail', () => {
    it('delegates to masaProvider.findConformiteSteuDetail with current year when authorized', async () => {
      const currentYear = new Date().getFullYear();
      const detail = makeConformiteSteuDetailRow();

      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);
      masaProvider.findConformiteSteuDetail.mockResolvedValue(detail);

      const result = await service.getConformiteSteuDetail(101, ['STEU001']);

      expect(masaProvider.findConformiteSteuDetail).toHaveBeenCalledWith(101, currentYear);
      expect(result).toEqual(detail);
    });

    it('returns null when steuCdn is not authorized', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);

      const result = await service.getConformiteSteuDetail(999, ['STEU001']);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Accès refusé au détail conformité STEU 999');
      expect(masaProvider.findConformiteSteuDetail).not.toHaveBeenCalled();
    });

    it('returns null detail from provider when authorized STEU has no detail', async () => {
      masaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 101 },
      ]);
      masaProvider.findConformiteSteuDetail.mockResolvedValue(null);

      const result = await service.getConformiteSteuDetail(101, ['STEU001']);

      expect(result).toBeNull();
      expect(masaProvider.findConformiteSteuDetail).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConformiteSclDetail', () => {
    it('delegates to masaProvider.findConformiteSclDetail with current year when authorized', async () => {
      const currentYear = new Date().getFullYear();
      const detail = makeConformiteSclDetailRow();

      masaProvider.findSclBySandreCda.mockResolvedValue(makeSclEntity(201));
      masaProvider.findConformiteSclDetail.mockResolvedValue(detail);

      const result = await service.getConformiteSclDetail(201, ['SCL001']);

      expect(masaProvider.findSclBySandreCda).toHaveBeenCalledWith('SCL001');
      expect(masaProvider.findConformiteSclDetail).toHaveBeenCalledWith(201, currentYear);
      expect(result).toEqual(detail);
    });

    it('returns null when sclCdn is not authorized', async () => {
      masaProvider.findSclBySandreCda.mockResolvedValue(makeSclEntity(201));

      const result = await service.getConformiteSclDetail(999, ['SCL001']);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Accès refusé au détail conformité SCL 999');
      expect(masaProvider.findConformiteSclDetail).not.toHaveBeenCalled();
    });

    it('returns null when no authorized SCL code resolves to a CDN', async () => {
      masaProvider.findSclBySandreCda.mockResolvedValue(null);

      const result = await service.getConformiteSclDetail(201, ['SCL001']);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Accès refusé au détail conformité SCL 201');
      expect(masaProvider.findConformiteSclDetail).not.toHaveBeenCalled();
    });
  });
});
