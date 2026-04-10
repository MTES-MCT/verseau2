import { INestApplication } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { ControleMapper } from '@dossier/controle/isov1/controle.mapper';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ControleRepository } from '@dossier/controle/controle.repository';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauBilanGateway } from '@referentiel/roseau/roseauBilan.gateway';
import { RoseauBilanRepository } from '@referentiel/roseau/roseauBilan.repository';
import { RoseauEvenementGateway } from '@referentiel/roseau/roseauEvenement.gateway';
import { RoseauEvenementRepository } from '@referentiel/roseau/roseauEvenement.repository';
import { RoseauRepository } from '@referentiel/roseau/roseau.repository';
import { RoseauTransmissionGateway } from '@referentiel/roseau/roseauTransmission.gateway';
import { RoseauTransmissionRepository } from '@referentiel/roseau/roseauTransmission.repository';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LanceleauRepository } from '@referentiel/lanceleau/lanceleau.repository';
import { MasaProvider } from '@masa/masa.provider';
import { ControleV1DataFetcherService } from '@dossier/controle/isov1/controleV1DataFetcher.service';

import { ControleName, ErrorCode } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';
import { startPostgresContainer, getPostgresConnectionUri } from '../../../testcontainer.config';
import {
  createReferentielDataset,
  clearReferentielData,
  seedSteu,
  seedItv,
  seedCxnadm,
  seedPmo,
  seedTlref,
  seedSup,
  seedFan,
  seedPar,
  seedUrf,
  seedScl,
  seedAga,
  seedCxntech,
} from '../../../createReferentielDataset';
import { seedDepot, clearDepots } from '../../../depot.helper';
import type { Analyse } from '@lib/parser';
import { initTestContainerImports } from '../../../init/initTestContainer';
import { LoggerServiceMock } from '@shared/logger/logger.mock';

// Import shared fixtures
import { createTestFctAssainissement } from '../../../fixtures/fctAssainissement.fixture';

describe('ControleV1Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let controleV1Service: ControleV1Service;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), CacheModule.register()],
      providers: [
        ControleV1Service,
        ControleMapper,
        ControleRepository,
        RoseauRepository,
        RoseauBilanRepository,
        RoseauEvenementRepository,
        LanceleauRepository,
        MasaProvider,
        ControleV1DataFetcherService,
        { provide: ControleGateway, useExisting: ControleRepository },
        { provide: RoseauGateway, useExisting: RoseauRepository },
        { provide: RoseauBilanGateway, useExisting: RoseauBilanRepository },
        { provide: RoseauEvenementGateway, useExisting: RoseauEvenementRepository },
        RoseauTransmissionRepository,
        { provide: RoseauTransmissionGateway, useExisting: RoseauTransmissionRepository },
        { provide: LanceleauGateway, useExisting: LanceleauRepository },
        { provide: LoggerService, useClass: LoggerServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(getDataSourceToken());
    controleV1Service = moduleFixture.get(ControleV1Service);

    // Create referentiel schemas and tables
    await createReferentielDataset(dataSource);

    // Synchronize app entities (depot, controle, user)
    await dataSource.synchronize();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await dataSource.query(`DELETE FROM controle`);
    await clearDepots(dataSource);
    await clearReferentielData(dataSource);
  });

  describe('CTL002 - verifySteuExists', () => {
    it('should pass when STEU exists', async () => {
      // Seed STEU
      await seedSteu(dataSource, 1, '0600000001');

      // Create depot
      await seedDepot(dataSource, 'dep_test_001');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [{ cdOuvrageDepollution: '0600000001', pointMesure: [] }],
      });

      const controles = await controleV1Service.execute('dep_test_001', fctAssainissement);

      const ctl002 = controles.find((c) => c.name === ControleName.CTL002);
      expect(ctl002).toBeDefined();
      expect(ctl002?.success).toBe(true);
    });

    it('should fail when STEU does not exist', async () => {
      // Create depot
      await seedDepot(dataSource, 'dep_test_002');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [{ cdOuvrageDepollution: 'UNKNOWN_STEU', pointMesure: [] }],
      });

      const controles = await controleV1Service.execute('dep_test_002', fctAssainissement);

      const ctl002 = controles.find((c) => c.name === ControleName.CTL002);
      expect(ctl002).toBeDefined();
      expect(ctl002?.success).toBe(false);
      expect(ctl002?.error).toBe(ErrorCode.E2_003);
    });

    it('should allow partial integration when multiple ouvrages exist but some are missing from database', async () => {
      // Seed only one STEU out of two
      await seedSteu(dataSource, 1, '0600000001');

      // Create depot
      await seedDepot(dataSource, 'dep_test_009');

      // File contains two ouvrages: one exists in DB, one doesn't
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          { cdOuvrageDepollution: '0600000001', pointMesure: [] }, // Exists in DB
          { cdOuvrageDepollution: 'UNKNOWN_STEU', pointMesure: [] }, // Does not exist in DB
        ],
      });

      const controles = await controleV1Service.execute('dep_test_009', fctAssainissement);

      const ctl002 = controles.find((c) => c.name === ControleName.CTL002);
      // CTL002 should fail because at least one ouvrage is missing
      expect(ctl002).toBeDefined();
      expect(ctl002?.success).toBe(false);
      // However, the system should allow partial integration for existing ouvrages
      expect(ctl002?.error).toBe(ErrorCode.E2_003);
    });
  });

  describe('CTL003 - verifyMoSteuExists', () => {
    it('should pass when MO connection exists', async () => {
      // Seed data
      await seedSteu(dataSource, 1, '0600000001');
      await seedItv(dataSource, 1001, 'SIRET123');
      await seedCxnadm(dataSource, 1, 1, 1001);

      // Create depot
      await seedDepot(dataSource, 'dep_test_003');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            maitreOuvrage: { cdIntervenant: 'SIRET123' },
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_003', fctAssainissement);

      const ctl003 = controles.find((c) => c.name === ControleName.CTL003);
      expect(ctl003).toBeDefined();
      expect(ctl003?.success).toBe(true);
    });

    it('should fail when ITV does not exist', async () => {
      // Seed STEU only
      await seedSteu(dataSource, 1, '0600000001');

      // Create depot
      await seedDepot(dataSource, 'dep_test_004');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            maitreOuvrage: { cdIntervenant: 'UNKNOWN_SIRET' },
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_004', fctAssainissement);

      const ctl003 = controles.find((c) => c.name === ControleName.CTL003);
      expect(ctl003).toBeDefined();
      expect(ctl003?.success).toBe(false);
      expect(ctl003?.error).toBe(ErrorCode.E2_004);
    });
  });

  describe('CTL004 - verifyExpSteuExists', () => {
    it('should pass when exploitant connection exists', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedItv(dataSource, 1001, 'EXP_SIRET');
      // cxnadm with exp_steu_cdn = 1 (steu_cdn) and steu_itv_cdn = 1001 (itv_cdn)
      await seedCxnadm(dataSource, 1, 0, 1001, 1);

      await seedDepot(dataSource, 'dep_test_ctl004_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            exploitant: { cdIntervenant: 'EXP_SIRET' },
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl004_pass', fctAssainissement);

      const ctl004 = controles.find((c) => c.name === ControleName.CTL004);
      expect(ctl004).toBeDefined();
      expect(ctl004?.success).toBe(true);
    });

    it('should fail when exploitant ITV does not exist', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl004_fail_itv');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            exploitant: { cdIntervenant: 'UNKNOWN_EXP' },
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl004_fail_itv', fctAssainissement);

      const ctl004 = controles.find((c) => c.name === ControleName.CTL004);
      expect(ctl004).toBeDefined();
      expect(ctl004?.success).toBe(false);
      expect(ctl004?.error).toBe(ErrorCode.E2_005);
    });

    it('should fail when cxnadm link does not exist for exploitant', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedItv(dataSource, 1001, 'EXP_SIRET');
      // No cxnadm with exp_steu_cdn matching

      await seedDepot(dataSource, 'dep_test_ctl004_fail_cxn');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            exploitant: { cdIntervenant: 'EXP_SIRET' },
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl004_fail_cxn', fctAssainissement);

      const ctl004 = controles.find((c) => c.name === ControleName.CTL004);
      expect(ctl004).toBeDefined();
      expect(ctl004?.success).toBe(false);
      expect(ctl004?.error).toBe(ErrorCode.E2_005);
    });

    it('should pass when no exploitant is provided (skipped)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl004_skip');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl004_skip', fctAssainissement);

      const ctl004 = controles.find((c) => c.name === ControleName.CTL004);
      expect(ctl004).toBeDefined();
      expect(ctl004?.success).toBe(true);
    });
  });

  describe('CTL005 - verifyPmoExists', () => {
    it('should pass when PMO exists', async () => {
      // Seed data: STEU, TLREF for the location point, and PMO linked to both
      await seedSteu(dataSource, 1, '0600000001');
      // TLREF with tlref_cdn=1 holds the location code '1A'
      await seedTlref(dataSource, 1, 'LREF_16', '1A');
      // PMO linked to steu_cdn=1, pmo_no='1', and tlref_16_cdn=1 (the location TLREF)
      await seedPmo(dataSource, 1, 1, '1', 1);

      // Create depot
      await seedDepot(dataSource, 'dep_test_005');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [{ numeroPointMesure: '1', locGlobalePointMesure: '1A', prelevement: [] }],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_005', fctAssainissement);

      const ctl005 = controles.find((c) => c.name === ControleName.CTL005);
      expect(ctl005).toBeDefined();
      expect(ctl005?.success).toBe(true);
    });

    it('should fail when PMO does not exist', async () => {
      // Seed STEU only
      await seedSteu(dataSource, 1, '0600000001');

      // Create depot
      await seedDepot(dataSource, 'dep_test_006');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [{ numeroPointMesure: '99', locGlobalePointMesure: '1A', prelevement: [] }],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_006', fctAssainissement);

      const ctl005 = controles.find((c) => c.name === ControleName.CTL005);

      expect(ctl005).toBeDefined();
      expect(ctl005?.success).toBe(false);
      expect(ctl005?.error).toBe(ErrorCode.E2_033);
    });
  });

  describe('CTL006 - verifySupExists', () => {
    it('should pass when support exists', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedSup(dataSource, 'SUP001');

      await seedDepot(dataSource, 'dep_test_ctl006_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    cdSupport: 'SUP001',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl006_pass', fctAssainissement);

      const ctl006 = controles.find((c) => c.name === ControleName.CTL006);
      expect(ctl006).toBeDefined();
      expect(ctl006?.success).toBe(true);
    });

    it('should fail when support does not exist', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl006_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    cdSupport: 'UNKNOWN_SUP',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl006_fail', fctAssainissement);

      const ctl006 = controles.find((c) => c.name === ControleName.CTL006);
      expect(ctl006).toBeDefined();
      expect(ctl006?.success).toBe(false);
      expect(ctl006?.error).toBe(ErrorCode.E2_006);
    });
  });

  describe('CTL007 - verifyLieuAnalyseExists', () => {
    it('should pass when lieu analyse exists in TLREF (LREF_43)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_43', 'LIEU001');

      await seedDepot(dataSource, 'dep_test_ctl007_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ inSituAnalyse: 'LIEU001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl007_pass', fctAssainissement);

      const ctl007 = controles.find((c) => c.name === ControleName.CTL007);
      expect(ctl007).toBeDefined();
      expect(ctl007?.success).toBe(true);
    });

    it('should fail when lieu analyse does not exist in TLREF (LREF_43)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl007_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ inSituAnalyse: 'UNKNOWN_LIEU' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl007_fail', fctAssainissement);

      const ctl007 = controles.find((c) => c.name === ControleName.CTL007);
      expect(ctl007).toBeDefined();
      expect(ctl007?.success).toBe(false);
      expect(ctl007?.error).toBe(ErrorCode.E2_007);
    });
  });

  describe('CTL008 - verifyStatutAnalyseExists', () => {
    it('should pass when statut analyse exists in TLREF (LREF_20)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_20', 'STAT001');

      await seedDepot(dataSource, 'dep_test_ctl008_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ statutRsAnalyse: 'STAT001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl008_pass', fctAssainissement);

      const ctl008 = controles.find((c) => c.name === ControleName.CTL008);
      expect(ctl008).toBeDefined();
      expect(ctl008?.success).toBe(true);
    });

    it('should fail when statut analyse does not exist in TLREF (LREF_20)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl008_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ statutRsAnalyse: 'UNKNOWN_STATUT' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl008_fail', fctAssainissement);

      const ctl008 = controles.find((c) => c.name === ControleName.CTL008);
      expect(ctl008).toBeDefined();
      expect(ctl008?.success).toBe(false);
      expect(ctl008?.error).toBe(ErrorCode.E2_008);
    });
  });

  describe('CTL009 - verifyQualAnalyseExists', () => {
    it('should pass when qualification analyse exists in TLREF (LREF_18)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_18', 'QUAL001');

      await seedDepot(dataSource, 'dep_test_ctl009_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ qualRsAnalyse: 'QUAL001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl009_pass', fctAssainissement);

      const ctl009 = controles.find((c) => c.name === ControleName.CTL009);
      expect(ctl009).toBeDefined();
      expect(ctl009?.success).toBe(true);
    });

    it('should fail when qualification analyse does not exist in TLREF (LREF_18)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl009_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ qualRsAnalyse: 'UNKNOWN_QUAL' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl009_fail', fctAssainissement);

      const ctl009 = controles.find((c) => c.name === ControleName.CTL009);
      expect(ctl009).toBeDefined();
      expect(ctl009?.success).toBe(false);
      expect(ctl009?.error).toBe(ErrorCode.E2_009);
    });
  });

  describe('CTL010 - verifyFanExists', () => {
    it('should pass when fraction analysee exists', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedFan(dataSource, 'FAN001');

      await seedDepot(dataSource, 'dep_test_ctl010_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdFractionAnalysee: 'FAN001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl010_pass', fctAssainissement);

      const ctl010 = controles.find((c) => c.name === ControleName.CTL010);
      expect(ctl010).toBeDefined();
      expect(ctl010?.success).toBe(true);
    });

    it('should fail when fraction analysee does not exist', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl010_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdFractionAnalysee: 'UNKNOWN_FAN' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl010_fail', fctAssainissement);

      const ctl010 = controles.find((c) => c.name === ControleName.CTL010);
      expect(ctl010).toBeDefined();
      expect(ctl010?.success).toBe(false);
      expect(ctl010?.error).toBe(ErrorCode.E2_010);
    });
  });

  describe('CTL011 - verifyMethodeAnalyseExists', () => {
    it('should pass when methode analyse exists in TLREF (LREF_45)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_45', 'METH001');

      await seedDepot(dataSource, 'dep_test_ctl011_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdMethode: 'METH001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl011_pass', fctAssainissement);

      const ctl011 = controles.find((c) => c.name === ControleName.CTL011);
      expect(ctl011).toBeDefined();
      expect(ctl011?.success).toBe(true);
    });

    it('should fail when methode analyse does not exist in TLREF (LREF_45)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl011_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdMethode: 'UNKNOWN_METH' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl011_fail', fctAssainissement);

      const ctl011 = controles.find((c) => c.name === ControleName.CTL011);
      expect(ctl011).toBeDefined();
      expect(ctl011?.success).toBe(false);
      expect(ctl011?.error).toBe(ErrorCode.E2_011);
    });
  });

  describe('CTL012 - verifyParametreExists', () => {
    it('should pass when parametre exists', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedPar(dataSource, 'PAR001');

      await seedDepot(dataSource, 'dep_test_ctl012_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdParametre: 'PAR001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl012_pass', fctAssainissement);

      const ctl012 = controles.find((c) => c.name === ControleName.CTL012);
      expect(ctl012).toBeDefined();
      expect(ctl012?.success).toBe(true);
    });

    it('should fail when parametre does not exist', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl012_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdParametre: 'UNKNOWN_PAR' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl012_fail', fctAssainissement);

      const ctl012 = controles.find((c) => c.name === ControleName.CTL012);
      expect(ctl012).toBeDefined();
      expect(ctl012?.success).toBe(false);
      expect(ctl012?.error).toBe(ErrorCode.E2_012);
    });
  });

  describe('CTL013 - verifyUniteMesureExists', () => {
    it('should pass when unite de mesure exists', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedUrf(dataSource, 'URF001');

      await seedDepot(dataSource, 'dep_test_ctl013_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdUniteMesure: 'URF001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl013_pass', fctAssainissement);

      const ctl013 = controles.find((c) => c.name === ControleName.CTL013);
      expect(ctl013).toBeDefined();
      expect(ctl013?.success).toBe(true);
    });

    it('should fail when unite de mesure does not exist', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl013_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdUniteMesure: 'UNKNOWN_URF' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl013_fail', fctAssainissement);

      const ctl013 = controles.find((c) => c.name === ControleName.CTL013);
      expect(ctl013).toBeDefined();
      expect(ctl013?.success).toBe(false);
      expect(ctl013?.error).toBe(ErrorCode.E2_013);
    });
  });

  describe('CTL014 - verifyIntervenantExists', () => {
    it('should pass when intervenant exists', async () => {
      // Seed ITV
      await seedItv(dataSource, 1, 'SIRET123');

      // Create depot
      await seedDepot(dataSource, 'dep_test_007');

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: { cdIntervenant: 'SIRET123' },
          destinataire: {},
          codeScenario: '2A',
          versionScenario: '2024.1',
        },
        ouvrages: [],
      });

      const controles = await controleV1Service.execute('dep_test_007', fctAssainissement);

      const ctl014 = controles.find((c) => c.name === ControleName.CTL014);
      expect(ctl014).toBeDefined();
      expect(ctl014?.success).toBe(true);
    });

    it('should fail when intervenant does not exist', async () => {
      // Create depot
      await seedDepot(dataSource, 'dep_test_008');

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: { cdIntervenant: 'UNKNOWN_SIRET' },
          destinataire: {},
          codeScenario: '2A',
          versionScenario: '2024.1',
        },
        ouvrages: [],
      });

      const controles = await controleV1Service.execute('dep_test_008', fctAssainissement);

      const ctl014 = controles.find((c) => c.name === ControleName.CTL014);
      expect(ctl014).toBeDefined();
      expect(ctl014?.success).toBe(false);
      expect(ctl014?.error).toBe(ErrorCode.E2_014);
    });
  });

  describe('CTL015 - verifyFinaliteAnalyseExists', () => {
    it('should pass when finalite analyse exists in TLREF (LREF_17)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_17', 'FIN001');

      await seedDepot(dataSource, 'dep_test_ctl015_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ finalite: 'FIN001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl015_pass', fctAssainissement);

      const ctl015 = controles.find((c) => c.name === ControleName.CTL015);
      expect(ctl015).toBeDefined();
      expect(ctl015?.success).toBe(true);
    });

    it('should fail when finalite analyse does not exist in TLREF (LREF_17)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl015_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ finalite: 'UNKNOWN_FIN' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl015_fail', fctAssainissement);

      const ctl015 = controles.find((c) => c.name === ControleName.CTL015);
      expect(ctl015).toBeDefined();
      expect(ctl015?.success).toBe(false);
      expect(ctl015?.error).toBe(ErrorCode.E2_015);
    });
  });

  describe('CTL016 - verifyAccreAnalyseExists', () => {
    it('should pass when accreditation code exists in TLREF (LREF_44)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedPmo(dataSource, 1, 1, '1');
      await seedTlref(dataSource, 1, 'LREF_44', 'ACC001');

      await seedDepot(dataSource, 'dep_test_016_001');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ accreAna: 'ACC001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_016_001', fctAssainissement);

      const ctl016 = controles.find((c) => c.name === ControleName.CTL016);
      expect(ctl016).toBeDefined();
      expect(ctl016?.success).toBe(true);
    });

    it('should fail when accreditation code does not exist in TLREF (LREF_44)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedPmo(dataSource, 1, 1, '1');

      await seedDepot(dataSource, 'dep_test_016_002');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ accreAna: 'UNKNOWN_ACCREDITATION' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_016_002', fctAssainissement);

      const ctl016 = controles.find((c) => c.name === ControleName.CTL016);
      expect(ctl016).toBeDefined();
      expect(ctl016?.success).toBe(false);
      expect(ctl016?.error).toBe(ErrorCode.E2_016);
    });
  });

  describe('CTL017 - verifyPeriodeCalculBouesExists', () => {
    it('should pass when periode de calcul exists in TLREF (LREF_61)', async () => {
      await seedTlref(dataSource, 1, 'LREF_61', 'PERIOD001');

      await seedDepot(dataSource, 'dep_test_ctl017_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            valeurCaracteristiqueRejets: [
              {
                periodeCalcul: 'PERIOD001',
                destination: { cdOuvrageAval: '', typeOuvrageAval: '' },
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl017_pass', fctAssainissement);

      const ctl017 = controles.find((c) => c.name === ControleName.CTL017);
      expect(ctl017).toBeDefined();
      expect(ctl017?.success).toBe(true);
    });

    it('should fail when periode de calcul does not exist in TLREF (LREF_61)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl017_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            valeurCaracteristiqueRejets: [
              {
                periodeCalcul: 'UNKNOWN_PERIOD',
                destination: { cdOuvrageAval: '', typeOuvrageAval: '' },
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl017_fail', fctAssainissement);

      const ctl017 = controles.find((c) => c.name === ControleName.CTL017);
      expect(ctl017).toBeDefined();
      expect(ctl017?.success).toBe(false);
      expect(ctl017?.error).toBe(ErrorCode.E2_017);
    });
  });

  describe('CTL018 - verifyTypeOuvrageAvalBouesExists', () => {
    it('should pass when type ouvrage aval exists in TLREF (LREF_15)', async () => {
      await seedTlref(dataSource, 1, 'LREF_15', 'TOA001');

      await seedDepot(dataSource, 'dep_test_ctl018_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            valeurCaracteristiqueRejets: [
              {
                periodeCalcul: '',
                destination: { cdOuvrageAval: '', typeOuvrageAval: 'TOA001' },
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl018_pass', fctAssainissement);

      const ctl018 = controles.find((c) => c.name === ControleName.CTL018);
      expect(ctl018).toBeDefined();
      expect(ctl018?.success).toBe(true);
    });

    it('should fail when type ouvrage aval does not exist in TLREF (LREF_15)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl018_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            valeurCaracteristiqueRejets: [
              {
                periodeCalcul: '',
                destination: { cdOuvrageAval: '', typeOuvrageAval: 'UNKNOWN_TOA' },
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl018_fail', fctAssainissement);

      const ctl018 = controles.find((c) => c.name === ControleName.CTL018);
      expect(ctl018).toBeDefined();
      expect(ctl018?.success).toBe(false);
      expect(ctl018?.error).toBe(ErrorCode.E2_018);
    });
  });

  describe('CTL019 - verifyOuvrageAvalBouesExists', () => {
    it('should pass when ouvrage aval (STEU) exists', async () => {
      await seedSteu(dataSource, 1, 'AVAL001');

      await seedDepot(dataSource, 'dep_test_ctl019_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            valeurCaracteristiqueRejets: [
              {
                periodeCalcul: '',
                destination: { cdOuvrageAval: 'AVAL001' },
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl019_pass', fctAssainissement);

      const ctl019 = controles.find((c) => c.name === ControleName.CTL019);
      expect(ctl019).toBeDefined();
      expect(ctl019?.success).toBe(true);
    });

    it('should fail when ouvrage aval (STEU) does not exist', async () => {
      await seedDepot(dataSource, 'dep_test_ctl019_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            valeurCaracteristiqueRejets: [
              {
                periodeCalcul: '',
                destination: { cdOuvrageAval: 'UNKNOWN_AVAL' },
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl019_fail', fctAssainissement);

      const ctl019 = controles.find((c) => c.name === ControleName.CTL019);
      expect(ctl019).toBeDefined();
      expect(ctl019?.success).toBe(false);
      expect(ctl019?.error).toBe(ErrorCode.E2_019);
    });
  });

  describe('CTL020 - verifyTypeEvenementExists', () => {
    it('should pass when type evenement exists in TLREF (LREF_46)', async () => {
      await seedTlref(dataSource, 1, 'LREF_46', 'EVT001');

      await seedDepot(dataSource, 'dep_test_ctl020_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            evenOuvragesAssainissement: [
              {
                typeEvenOuvrageAssainissement: 'EVT001',
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl020_pass', fctAssainissement);

      const ctl020 = controles.find((c) => c.name === ControleName.CTL020);
      expect(ctl020).toBeDefined();
      expect(ctl020?.success).toBe(true);
    });

    it('should fail when type evenement does not exist in TLREF (LREF_46)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl020_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [],
            evenOuvragesAssainissement: [
              {
                typeEvenOuvrageAssainissement: 'UNKNOWN_EVT',
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl020_fail', fctAssainissement);

      const ctl020 = controles.find((c) => c.name === ControleName.CTL020);
      expect(ctl020).toBeDefined();
      expect(ctl020?.success).toBe(false);
      expect(ctl020?.error).toBe(ErrorCode.E2_020);
    });
  });

  describe('CTL021 - verifyCodeRemarqueExists', () => {
    it('should pass when code remarque exists in TLREF (LREF_21)', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_21', 'REM001');

      await seedDepot(dataSource, 'dep_test_ctl021_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdRemAnalyse: 'REM001' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl021_pass', fctAssainissement);

      const ctl021 = controles.find((c) => c.name === ControleName.CTL021);
      expect(ctl021).toBeDefined();
      expect(ctl021?.success).toBe(true);
    });

    it('should fail when code remarque does not exist in TLREF (LREF_21)', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl021_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    analyse: [{ cdRemAnalyse: 'UNKNOWN_REM' } as Analyse],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl021_fail', fctAssainissement);

      const ctl021 = controles.find((c) => c.name === ControleName.CTL021);
      expect(ctl021).toBeDefined();
      expect(ctl021?.success).toBe(false);
      expect(ctl021?.error).toBe(ErrorCode.E2_021);
    });
  });

  describe('CTL022 - verifySystemeDeCollecteExists', () => {
    it('should pass when systeme de collecte exists', async () => {
      await seedScl(dataSource, 1, 'SCL001');

      await seedDepot(dataSource, 'dep_test_ctl022_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl022_pass', fctAssainissement);

      const ctl022 = controles.find((c) => c.name === ControleName.CTL022);
      expect(ctl022).toBeDefined();
      expect(ctl022?.success).toBe(true);
    });

    it('should fail when systeme de collecte does not exist', async () => {
      await seedDepot(dataSource, 'dep_test_ctl022_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'UNKNOWN_SCL',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl022_fail', fctAssainissement);

      const ctl022 = controles.find((c) => c.name === ControleName.CTL022);
      expect(ctl022).toBeDefined();
      expect(ctl022?.success).toBe(false);
      expect(ctl022?.error).toBe(ErrorCode.E2_022);
    });
  });

  describe('CTL023 - verifySystemeCollecteLinkedToAgglomeration', () => {
    it('should pass when systeme collecte is linked to agglomeration', async () => {
      // Create SCL, AGA, and CXNTECH linking them
      await seedScl(dataSource, 1, 'SCL001');
      await seedAga(dataSource, 1, 100, 'AGG001'); // zgc_cdn = 100
      await seedCxntech(dataSource, 1, 1, 100); // aval_scl_cdn = 1 (scl_cdn), amont_zgc_cdn = 100

      await seedDepot(dataSource, 'dep_test_ctl023_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [],
            agglomerationAssainissement: {
              cdAgglomerationAssainissement: 'AGG001',
            },
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl023_pass', fctAssainissement);

      const ctl023 = controles.find((c) => c.name === ControleName.CTL023);
      expect(ctl023).toBeDefined();
      expect(ctl023?.success).toBe(true);
    });

    it('should fail when systeme collecte is not linked to agglomeration', async () => {
      await seedScl(dataSource, 1, 'SCL001');
      await seedAga(dataSource, 1, 100, 'AGG001');
      // No cxntech linking them

      await seedDepot(dataSource, 'dep_test_ctl023_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [],
            agglomerationAssainissement: {
              cdAgglomerationAssainissement: 'AGG001',
            },
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl023_fail', fctAssainissement);

      const ctl023 = controles.find((c) => c.name === ControleName.CTL023);
      expect(ctl023).toBeDefined();
      expect(ctl023?.success).toBe(false);
      expect(ctl023?.error).toBe(ErrorCode.E2_023);
    });

    it('should fail when cxntech has a retrait date (inactive link)', async () => {
      await seedScl(dataSource, 1, 'SCL001');
      await seedAga(dataSource, 1, 100, 'AGG001');
      // cxntech with retrait date = link is inactive
      await seedCxntech(dataSource, 1, 1, 100, new Date('2023-01-01'));

      await seedDepot(dataSource, 'dep_test_ctl023_retrait');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [],
            agglomerationAssainissement: {
              cdAgglomerationAssainissement: 'AGG001',
            },
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl023_retrait', fctAssainissement);

      const ctl023 = controles.find((c) => c.name === ControleName.CTL023);
      expect(ctl023).toBeDefined();
      expect(ctl023?.success).toBe(false);
      expect(ctl023?.error).toBe(ErrorCode.E2_023);
    });
  });

  describe('CTL024 - verifyTypeOuvrageExists', () => {
    it('should pass when type ouvrage exists in TLREF (LREF_01)', async () => {
      await seedTlref(dataSource, 1, 'LREF_01', 'TYPE001');

      await seedDepot(dataSource, 'dep_test_ctl024_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            typeOuvrageDepollution: 'TYPE001',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl024_pass', fctAssainissement);

      const ctl024 = controles.find((c) => c.name === ControleName.CTL024);
      expect(ctl024).toBeDefined();
      expect(ctl024?.success).toBe(true);
    });

    it('should fail when type ouvrage does not exist in TLREF (LREF_01)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl024_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            typeOuvrageDepollution: 'UNKNOWN_TYPE',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl024_fail', fctAssainissement);

      const ctl024 = controles.find((c) => c.name === ControleName.CTL024);
      expect(ctl024).toBeDefined();
      expect(ctl024?.success).toBe(false);
      expect(ctl024?.error).toBe(ErrorCode.E2_024);
    });
  });

  describe('CTL025 - verifyNatureSystemeCollecteExists', () => {
    it('should pass when nature systeme traitement exists in TLREF (LREF_09)', async () => {
      await seedTlref(dataSource, 1, 'LREF_09', 'NAT001');

      await seedDepot(dataSource, 'dep_test_ctl025_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            natureSystTraitementEauxUsees: 'NAT001',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl025_pass', fctAssainissement);

      const ctl025 = controles.find((c) => c.name === ControleName.CTL025);
      expect(ctl025).toBeDefined();
      expect(ctl025?.success).toBe(true);
    });

    it('should fail when nature systeme traitement does not exist in TLREF (LREF_09)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl025_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            natureSystTraitementEauxUsees: 'UNKNOWN_NAT',
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl025_fail', fctAssainissement);

      const ctl025 = controles.find((c) => c.name === ControleName.CTL025);
      expect(ctl025).toBeDefined();
      expect(ctl025?.success).toBe(false);
      expect(ctl025?.error).toBe(ErrorCode.E2_025);
    });
  });

  describe('CTL026 - verifyIntervenantEmetteurExists', () => {
    it('should pass when emetteur intervenant exists', async () => {
      await seedItv(dataSource, 1, 'EMIT001');

      await seedDepot(dataSource, 'dep_test_ctl026_pass');

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: { cdIntervenant: 'EMIT001' },
          codeScenario: '2A',
          versionScenario: '2024.1',
        },
        ouvrages: [],
      });

      const controles = await controleV1Service.execute('dep_test_ctl026_pass', fctAssainissement);

      const ctl026 = controles.find((c) => c.name === ControleName.CTL026);
      expect(ctl026).toBeDefined();
      expect(ctl026?.success).toBe(true);
    });

    it('should fail when emetteur intervenant does not exist', async () => {
      await seedDepot(dataSource, 'dep_test_ctl026_fail');

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: { cdIntervenant: 'UNKNOWN_EMIT' },
          codeScenario: '2A',
          versionScenario: '2024.1',
        },
        ouvrages: [],
      });

      const controles = await controleV1Service.execute('dep_test_ctl026_fail', fctAssainissement);

      const ctl026 = controles.find((c) => c.name === ControleName.CTL026);
      expect(ctl026).toBeDefined();
      expect(ctl026?.success).toBe(false);
      expect(ctl026?.error).toBe(ErrorCode.E2_026);
    });

    it('should pass when no emetteur is provided (skipped)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl026_skip');

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: '2A',
          versionScenario: '2024.1',
        },
        ouvrages: [],
      });

      const controles = await controleV1Service.execute('dep_test_ctl026_skip', fctAssainissement);

      const ctl026 = controles.find((c) => c.name === ControleName.CTL026);
      expect(ctl026).toBeDefined();
      expect(ctl026?.success).toBe(true);
    });
  });

  describe('CTL035 - verifyCodeConformitePrelevement', () => {
    it('should pass when conformite prelevement exists in TLREF (LREF_92)', async () => {
      await seedScl(dataSource, 1, 'SCL001');
      await seedTlref(dataSource, 1, 'LREF_92', 'CONF001');

      await seedDepot(dataSource, 'dep_test_ctl035_pass');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    conformitePrlvt: 'CONF001',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl035_pass', fctAssainissement);

      const ctl035 = controles.find((c) => c.name === ControleName.CTL035);
      expect(ctl035).toBeDefined();
      expect(ctl035?.success).toBe(true);
    });

    it('should fail when conformite prelevement does not exist in TLREF (LREF_92)', async () => {
      await seedDepot(dataSource, 'dep_test_ctl035_fail');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    conformitePrlvt: 'UNKNOWN_CONF',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl035_fail', fctAssainissement);

      const ctl035 = controles.find((c) => c.name === ControleName.CTL035);
      expect(ctl035).toBeDefined();
      expect(ctl035?.success).toBe(false);
      expect(ctl035?.error).toBe(ErrorCode.E2_035);
    });
  });

  describe('CTL036 - verifyCodeAccreditationExists', () => {
    it('should pass when accreditation prelevement exists in TLREF (LREF_44) for ouvrage', async () => {
      await seedSteu(dataSource, 1, '0600000001');
      await seedTlref(dataSource, 1, 'LREF_44', 'ACCR001');

      await seedDepot(dataSource, 'dep_test_ctl036_pass_ouv');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    accrePrlvt: 'ACCR001',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl036_pass_ouv', fctAssainissement);

      const ctl036 = controles.find((c) => c.name === ControleName.CTL036);
      expect(ctl036).toBeDefined();
      expect(ctl036?.success).toBe(true);
    });

    it('should fail when accreditation prelevement does not exist in TLREF (LREF_44) for ouvrage', async () => {
      await seedSteu(dataSource, 1, '0600000001');

      await seedDepot(dataSource, 'dep_test_ctl036_fail_ouv');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0600000001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    accrePrlvt: 'UNKNOWN_ACCR',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl036_fail_ouv', fctAssainissement);

      const ctl036 = controles.find((c) => c.name === ControleName.CTL036);
      expect(ctl036).toBeDefined();
      expect(ctl036?.success).toBe(false);
      expect(ctl036?.error).toBe(ErrorCode.E2_036);
    });

    it('should pass when accreditation prelevement exists in TLREF (LREF_44) for systeme collecte', async () => {
      await seedScl(dataSource, 1, 'SCL001');
      await seedTlref(dataSource, 1, 'LREF_44', 'ACCR001');

      await seedDepot(dataSource, 'dep_test_ctl036_pass_scl');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    accrePrlvt: 'ACCR001',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl036_pass_scl', fctAssainissement);

      const ctl036 = controles.find((c) => c.name === ControleName.CTL036);
      expect(ctl036).toBeDefined();
      expect(ctl036?.success).toBe(true);
    });

    it('should fail when accreditation prelevement does not exist in TLREF (LREF_44) for systeme collecte', async () => {
      await seedDepot(dataSource, 'dep_test_ctl036_fail_scl');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL001',
            pointMesure: [
              {
                numeroPointMesure: '1',
                prelevement: [
                  {
                    accrePrlvt: 'UNKNOWN_ACCR',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_test_ctl036_fail_scl', fctAssainissement);

      const ctl036 = controles.find((c) => c.name === ControleName.CTL036);
      expect(ctl036).toBeDefined();
      expect(ctl036?.success).toBe(false);
      expect(ctl036?.error).toBe(ErrorCode.E2_036);
    });
  });

  describe('Batch regression - CHAR(n) column padding', () => {
    // Simulates production DB where columns use CHAR(n) instead of VARCHAR.
    // PostgreSQL CHAR(n) pads stored values with trailing spaces.
    // The IN clause still matches (PG ignores trailing spaces in char comparison),
    // but the returned entity values include padding, causing Map key mismatches.
    beforeAll(async () => {
      await dataSource.query(`ALTER TABLE roseau.steu ALTER COLUMN steu_sandre_cda TYPE CHAR(20)`);
      await dataSource.query(`ALTER TABLE roseau.pmo ALTER COLUMN pmo_no TYPE CHAR(10)`);
      await dataSource.query(`ALTER TABLE roseau.tlref ALTER COLUMN tlref_elt_cda TYPE CHAR(10)`);
      await dataSource.query(`ALTER TABLE lanceleau.itv ALTER COLUMN itv_rfa TYPE CHAR(20)`);
    });

    afterAll(async () => {
      await dataSource.query(`ALTER TABLE roseau.steu ALTER COLUMN steu_sandre_cda TYPE VARCHAR`);
      await dataSource.query(`ALTER TABLE roseau.pmo ALTER COLUMN pmo_no TYPE VARCHAR`);
      await dataSource.query(`ALTER TABLE roseau.tlref ALTER COLUMN tlref_elt_cda TYPE VARCHAR`);
      await dataSource.query(`ALTER TABLE lanceleau.itv ALTER COLUMN itv_rfa TYPE VARCHAR`);
    });

    it('CTL002 should pass when STEU exists in CHAR(n) column', async () => {
      await seedSteu(dataSource, 1, '0442165S0005');
      await seedDepot(dataSource, 'dep_char_ctl002');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [{ cdOuvrageDepollution: '0442165S0005', pointMesure: [] }],
      });

      const controles = await controleV1Service.execute('dep_char_ctl002', fctAssainissement);

      const ctl002 = controles.find((c) => c.name === ControleName.CTL002);
      expect(ctl002).toBeDefined();
      expect(ctl002?.success).toBe(true);
    });

    it('CTL005 should pass when PMO exists in CHAR(n) columns', async () => {
      await seedSteu(dataSource, 1, '0442165S0005');
      await seedTlref(dataSource, 1, 'LREF_16', 'S15');
      await seedPmo(dataSource, 1, 1, '14', 1);
      await seedDepot(dataSource, 'dep_char_ctl005');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0442165S0005',
            pointMesure: [{ numeroPointMesure: '14', locGlobalePointMesure: 'S15', prelevement: [] }],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_char_ctl005', fctAssainissement);

      const ctl005 = controles.find((c) => c.name === ControleName.CTL005);
      expect(ctl005).toBeDefined();
      expect(ctl005?.success).toBe(true);
    });

    it('CTL004 should pass when exploitant exists in CHAR(n) column', async () => {
      await seedSteu(dataSource, 1, '0442165S0005');
      await seedItv(dataSource, 1001, 'EXP_SIRET');
      await seedCxnadm(dataSource, 1, 0, 1001, 1);
      await seedDepot(dataSource, 'dep_char_ctl004');

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: '0442165S0005',
            exploitant: { cdIntervenant: 'EXP_SIRET' },
            pointMesure: [],
          },
        ],
      });

      const controles = await controleV1Service.execute('dep_char_ctl004', fctAssainissement);

      const ctl004 = controles.find((c) => c.name === ControleName.CTL004);
      expect(ctl004).toBeDefined();
      expect(ctl004?.success).toBe(true);
    });
  });
});
