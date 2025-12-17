import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { ControleMapper } from '@dossier/controle/isov1/controle.mapper';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ControleRepository } from '@dossier/controle/controle.repository';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { UserEntity } from '@user/user.entity';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauRepository } from '@referentiel/roseau/roseau.repository';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LanceleauRepository } from '@referentiel/lanceleau/lanceleau.repository';
import { SteuEntity } from '@referentiel/roseau/entities/steu.entity';
import { CxnadmEntity } from '@referentiel/roseau/entities/cxnadm.entity';
import { PmoEntity } from '@referentiel/roseau/entities/pmo.entity';
import { TlrefEntity } from '@referentiel/roseau/entities/tlref.entity';
import { AgaEntity } from '@referentiel/roseau/entities/aga.entity';
import { SclEntity } from '@referentiel/roseau/entities/scl.entity';
import { CxntechEntity } from '@referentiel/roseau/entities/cxntech.entity';
import { ItvEntity } from '@referentiel/lanceleau/entities/itv.entity';
import { SupEntity } from '@referentiel/lanceleau/entities/sup.entity';
import { FanEntity } from '@referentiel/lanceleau/entities/fan.entity';
import { ParEntity } from '@referentiel/lanceleau/entities/par.entity';
import { UrfEntity } from '@referentiel/lanceleau/entities/urf.entity';
import { ControleName, ErrorCode } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';
import { startPostgresContainer, stopPostgresContainer, getPostgresConnectionUri } from '../../../testcontainer.config';
import {
  createReferentielDataset,
  clearReferentielData,
  seedSteu,
  seedItv,
  seedCxnadm,
  seedPmo,
  seedTlref,
} from '../../../createReferentielDataset';
import { seedDepot, clearDepots } from '../../../depot.helper';
import type { Analyse, Emetteur, FctAssainissement, OuvrageDepollution, SystemeCollecte } from '@lib/parser';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';

type PartialFctAssainissement = {
  scenario?: {
    emetteur: Partial<Emetteur>;
    destinataire: Partial<Emetteur>;
    codeScenario: string;
    versionScenario: string;
  };
  ouvrages?: Partial<OuvrageDepollution>[];
  systemesCollecte?: Partial<SystemeCollecte>;
};

// Helper to create minimal FctAssainissement for testing
function createTestFctAssainissement(overrides: PartialFctAssainissement = {}): FctAssainissement {
  return {
    scenario: {
      emetteur: {},
      codeScenario: SandreScenarioCode.FCT_ASSAIN,
      versionScenario: SandreScenarioVersion.V4,
      dateDebutReference: '',
      dateFinReference: '',
    },
    ouvrages: [],
    systemesCollecte: [],
    ...overrides,
  } as FctAssainissement;
}

describe('ControleV1Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let controleV1Service: ControleV1Service;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connectionUri,
          entities: [
            // App entities
            ControleEntity,
            DepotEntity,
            UserEntity,
            // Roseau entities
            SteuEntity,
            CxnadmEntity,
            PmoEntity,
            TlrefEntity,
            AgaEntity,
            SclEntity,
            CxntechEntity,
            // Lanceleau entities
            ItvEntity,
            SupEntity,
            FanEntity,
            ParEntity,
            UrfEntity,
          ],
          synchronize: false,
        }),
        TypeOrmModule.forFeature([
          ControleEntity,
          DepotEntity,
          UserEntity,
          SteuEntity,
          CxnadmEntity,
          PmoEntity,
          TlrefEntity,
          AgaEntity,
          SclEntity,
          CxntechEntity,
          ItvEntity,
          SupEntity,
          FanEntity,
          ParEntity,
          UrfEntity,
        ]),
      ],
      providers: [
        LoggerService,
        ControleV1Service,
        ControleMapper,
        ControleRepository,
        RoseauRepository,
        LanceleauRepository,
        { provide: ControleGateway, useExisting: ControleRepository },
        { provide: RoseauGateway, useExisting: RoseauRepository },
        { provide: LanceleauGateway, useExisting: LanceleauRepository },
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
    await stopPostgresContainer();
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
      await seedSteu(dataSource, 'STEU001', '0600000001');

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
      await seedSteu(dataSource, 'STEU001', '0600000001');

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
      console.log(ctl002);
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
      await seedSteu(dataSource, 'STEU001', '0600000001');
      await seedItv(dataSource, '1001', 'SIRET123');
      await seedCxnadm(dataSource, 'CXNADM001', 'STEU001', '1001');

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
      await seedSteu(dataSource, 'STEU001', '0600000001');

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

  describe('CTL005 - verifyPmoExists', () => {
    it.skip('should pass when PMO exists', async () => {
      // Seed data
      await seedSteu(dataSource, 'STEU001', '0600000001');
      await seedPmo(dataSource, 'PMO001', 'STEU001', 1);
      await seedTlref(dataSource, 'TLREF001', 'LREF_44', '1A');

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
      await seedSteu(dataSource, 'STEU001', '0600000001');

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

  describe('CTL014 - verifyIntervenantExists', () => {
    it('should pass when intervenant exists', async () => {
      // Seed ITV
      await seedItv(dataSource, 'ITV001', 'SIRET123');

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

  describe('CTL016 - verifyAccreAnalyseExists', () => {
    it('should pass when accreditation code exists in TLREF (LREF_44)', async () => {
      await seedSteu(dataSource, 'STEU001', '0600000001');
      await seedPmo(dataSource, 'PMO001', 'STEU001', 1);
      await seedTlref(dataSource, 'TLREF001', 'LREF_44', 'ACC001');

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
      await seedSteu(dataSource, 'STEU001', '0600000001');
      await seedPmo(dataSource, 'PMO001', 'STEU001', 1);

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
});
