/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ConformiteController } from './conformite.controller';
import { ConformiteService } from './conformite.service';

describe('ConformiteController', () => {
  let controller: ConformiteController;
  let conformiteService: jest.Mocked<ConformiteService>;

  beforeEach(async () => {
    const mockConformiteService: jest.Mocked<Partial<ConformiteService>> = {
      listConformiteSteu: jest.fn(),
      listConformiteScl: jest.fn(),
      getConformiteSteuDetail: jest.fn(),
      getConformiteSclDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConformiteController],
      providers: [
        {
          provide: ConformiteService,
          useValue: mockConformiteService,
        },
      ],
    })
      .overrideGuard(MeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(HasUserAccessToOuvragesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConformiteController>(ConformiteController);
    conformiteService = module.get(ConformiteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = (
    authorizedSteuCdas: string[] = ['STEU001'],
    authorizedSclCdas: string[] = ['SCL001'],
  ): CustomRequest =>
    ({
      user: { itvCdn: 42, isExpertNational: false, cerbereId: 'test', mel: 'test@example.com' },
      authorizedSteuCdas,
      authorizedSclCdas,
    }) as unknown as CustomRequest;

  it('delegates listConformiteSteu with authorized STEU codes and query filters', async () => {
    const response = {
      data: [
        {
          steuCdn: 101,
          ouvrageDepollutionCode: 'STEU001',
          ouvrageDepollutionNom: 'Station test',
          trancheObligationLibelle: '[ 2 000 ; 10 000 [ EH',
          capaciteNominaleEH: 5000,
          suiviDebutDate: '2024-01-01',
          suiviFinDate: '2024-12-31',
          conformiteLocaleProvisoire: 'Conforme',
          conformiteNationaleProvisoire: 'Non conforme',
          impactConformite: true,
          suiviRegulierEffectue: true,
          suiviRegulierDate: '2024-06-15',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    conformiteService.listConformiteSteu.mockResolvedValue(response);

    const result = await controller.listConformiteSteu(makeRequest(['STEU001']), {
      year: 2024,
      trancheObligationRfa: '30',
      impact: 'avec',
      page: 1,
      pageSize: 20,
      sortBy: 'ouvrageDepollutionCode',
      sortOrder: 'ASC',
    });

    expect(conformiteService.listConformiteSteu).toHaveBeenCalledWith({
      authorizedSteuCdas: ['STEU001'],
      year: 2024,
      trancheObligationRfa: '30',
      impact: 'avec',
      page: 1,
      pageSize: 20,
      sortBy: 'ouvrageDepollutionCode',
      sortOrder: 'ASC',
    });
    expect(result).toEqual({
      data: [
        {
          steuCdn: 101,
          ouvrageDepollutionCode: 'STEU001',
          ouvrageDepollutionNom: 'Station test',
          trancheObligationLibelle: '[ 2 000 ; 10 000 [ EH',
          capaciteNominaleEH: 5000,
          suiviDebutDate: '2024-01-01',
          suiviFinDate: '2024-12-31',
          conformiteLocaleProvisoire: 'Conforme',
          impactConformite: true,
          suiviRegulierEffectue: true,
          suiviRegulierDate: '2024-06-15',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('delegates listConformiteScl with authorized STEU codes and query filters', async () => {
    const response = {
      data: [
        {
          sclCdn: 201,
          systemeCollecteCode: 'SCL001',
          systemeCollecteNom: 'Réseau test',
          trancheObligationLibelle: '[ 10 000 ; 100 000 [ EH',
          typeScl: 'Unitaire',
          suiviDebutDate: '2024-01-01',
          suiviFinDate: '2024-12-31',
          conformiteLocaleTempsPluieProvisoire: 'Conforme',
          conformiteNationaleTempsPluieProvisoire: 'Non conforme',
          impactConformite: false,
          suiviRegulierEffectue: true,
          suiviRegulierDate: '2024-07-01',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    };
    conformiteService.listConformiteScl.mockResolvedValue(response);

    const result = await controller.listConformiteScl(makeRequest(['STEU002'], ['SCL001']), {
      year: 2023,
      trancheObligationRfa: '40',
      impact: 'sans',
      page: 2,
      pageSize: 10,
      sortBy: 'systemeCollecteCode',
      sortOrder: 'DESC',
    });

    expect(conformiteService.listConformiteScl).toHaveBeenCalledWith({
      authorizedSteuCdas: ['STEU002'],
      year: 2023,
      trancheObligationRfa: '40',
      impact: 'sans',
      page: 2,
      pageSize: 10,
      sortBy: 'systemeCollecteCode',
      sortOrder: 'DESC',
    });
    expect(result).toEqual({
      data: [
        {
          sclCdn: 201,
          systemeCollecteCode: 'SCL001',
          systemeCollecteNom: 'Réseau test',
          trancheObligationLibelle: '[ 10 000 ; 100 000 [ EH',
          typeScl: 'Unitaire',
          suiviDebutDate: '2024-01-01',
          suiviFinDate: '2024-12-31',
          conformiteLocaleTempsPluieProvisoire: 'Conforme',
          impactConformite: false,
          suiviRegulierEffectue: true,
          suiviRegulierDate: '2024-07-01',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it('delegates getConformiteSteuDetail with route param and authorized STEU codes', async () => {
    const response = {
      conformiteLocaleParametresConformesPeriodeNb: 1,
      conformiteLocaleParametresConformesAnneeNb: 2,
      conformiteLocaleParametresNonConformesPeriodeNb: 3,
      conformiteLocaleParametresNonConformesAnneeNb: 4,
      conformiteLocaleRedhibitoiresPeriodeNb: 5,
      conformiteLocaleRedhibitoiresAnneeNb: 6,
      conformiteLocaleParametresConformesPeriodeLb: 'ok',
      conformiteLocaleParametresConformesAnneeLb: 'ok',
      conformiteLocaleParametresNonConformesPeriodeLb: 'ko',
      conformiteLocaleParametresNonConformesAnneeLb: 'ko',
      conformiteLocaleRedhibitoiresPeriodeLb: 'ko',
      conformiteLocaleRedhibitoiresAnneeLb: 'ko',
      conformiteNationaleParametresConformesPeriodeNb: 9,
      conformiteNationaleParametresConformesAnneeNb: 10,
      conformiteNationaleParametresNonConformesPeriodeNb: 11,
      conformiteNationaleParametresNonConformesAnneeNb: 12,
      conformiteNationaleRedhibitoiresPeriodeNb: 13,
      conformiteNationaleRedhibitoiresAnneeNb: 14,
      conformiteNationaleParametresConformesPeriodeLb: 'nat ok',
      conformiteNationaleParametresConformesAnneeLb: 'nat ok',
      conformiteNationaleParametresNonConformesPeriodeLb: 'nat ko',
      conformiteNationaleParametresNonConformesAnneeLb: 'nat ko',
      conformiteNationaleRedhibitoiresPeriodeLb: 'nat ko',
      conformiteNationaleRedhibitoiresAnneeLb: 'nat ko',
      hcnfPeriodeNb: 1,
      hcnfAnneeNb: 2,
      hctsPeriodeNb: 3,
      hctsAnneeNb: 4,
      hcnfPeriodeLb: 'a',
      hcnfAnneeLb: 'b',
      hctsPeriodeLb: 'c',
      hctsAnneeLb: 'd',
      evenementsPeriodeNb: 7,
      evenementsAnneeNb: 8,
    };
    conformiteService.getConformiteSteuDetail.mockResolvedValue(response);

    const result = await controller.getConformiteSteuDetail(makeRequest(['STEU003']), { steuCdn: 321 }, { year: 2022 });

    expect(conformiteService.getConformiteSteuDetail).toHaveBeenCalledWith(321, 2022, ['STEU003']);
    expect(result).toEqual({
      conformiteLocaleParametresConformesPeriodeNb: 1,
      conformiteLocaleParametresConformesAnneeNb: 2,
      conformiteLocaleParametresNonConformesPeriodeNb: 3,
      conformiteLocaleParametresNonConformesAnneeNb: 4,
      conformiteLocaleRedhibitoiresPeriodeNb: 5,
      conformiteLocaleRedhibitoiresAnneeNb: 6,
      conformiteLocaleParametresConformesPeriodeLb: 'ok',
      conformiteLocaleParametresConformesAnneeLb: 'ok',
      conformiteLocaleParametresNonConformesPeriodeLb: 'ko',
      conformiteLocaleParametresNonConformesAnneeLb: 'ko',
      conformiteLocaleRedhibitoiresPeriodeLb: 'ko',
      conformiteLocaleRedhibitoiresAnneeLb: 'ko',
      hcnfPeriodeNb: 1,
      hcnfAnneeNb: 2,
      hctsPeriodeNb: 3,
      hctsAnneeNb: 4,
      hcnfPeriodeLb: 'a',
      hcnfAnneeLb: 'b',
      hctsPeriodeLb: 'c',
      hctsAnneeLb: 'd',
      evenementsPeriodeNb: 7,
      evenementsAnneeNb: 8,
    });
  });

  it('delegates getConformiteSclDetail with route param and authorized SCL codes', async () => {
    conformiteService.getConformiteSclDetail.mockResolvedValue(null);

    const result = await controller.getConformiteSclDetail(
      makeRequest(['STEU003'], ['SCL009']),
      { sclCdn: 987 },
      { year: 2021 },
    );

    expect(conformiteService.getConformiteSclDetail).toHaveBeenCalledWith(987, 2021, ['SCL009']);
    expect(result).toBeNull();
  });
});
