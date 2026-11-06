import { INestApplication } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { ControleMapper } from '@dossier/controle/isov1/controle.mapper';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ControleRepository } from '@dossier/controle/controle.repository';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauReferentielPointMesureGateway } from '@referentiel/roseau/roseauReferentielPointMesure.gateway';
import { RoseauReferentielPointMesureRepository } from '@referentiel/roseau/roseauReferentielPointMesure.repository';
import { RoseauBilanGateway } from '@referentiel/roseau/roseauBilan.gateway';
import { RoseauBilanRepository } from '@referentiel/roseau/roseauBilan.repository';
import { RoseauConformiteGateway } from '@referentiel/roseau/roseauConformite.gateway';
import { RoseauConformiteRepository } from '@referentiel/roseau/roseauConformite.repository';
import { RoseauEvenementGateway } from '@referentiel/roseau/roseauEvenement.gateway';
import { RoseauEvenementRepository } from '@referentiel/roseau/roseauEvenement.repository';
import { RoseauRepository } from '@referentiel/roseau/roseau.repository';
import { RoseauTransmissionGateway } from '@referentiel/roseau/roseauTransmission.gateway';
import { RoseauMesureDeposeeGateway } from '@referentiel/roseau/roseauMesureDeposee.gateway';
import { RoseauTransmissionRepository } from '@referentiel/roseau/roseauTransmission.repository';
import { RoseauMesureDeposeeRepository } from '@referentiel/roseau/roseauMesureDeposee.repository';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LanceleauRepository } from '@referentiel/lanceleau/lanceleau.repository';
import { ControleMetierV2Service } from '@dossier/controle/metierv2/controleMetierV2.service';
import { ControleMetierV2Pfas } from '@dossier/controle/metierv2/controleMetierV2Pfas';
import { MasaProvider } from '@masa/masa.provider';
import {
  filterFctAssainissementForMetierV2,
  type FilterFctAssainissementForMetierVOptions,
} from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';
import { CodeParametre } from '@lib/dossier';

import { ControleName, ErrorCode, EvenementType } from '@lib/dossier';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { LoggerService } from '@shared/logger/logger.service';
import { startPostgresContainer, getPostgresConnectionUri } from '../../../testcontainer.config';
import {
  createReferentielDataset,
  clearReferentielData,
  seedSteu,
  seedResa,
  seedCpy,
  seedStchan,
  seedTltobl,
  seedAga,
  seedAgac,
} from '../../../createReferentielDataset';
import { clearDepots, seedDepot } from '../../../depot.helper';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';
import { initTestContainerImports } from '../../../init/initTestContainer';
import { ControleModel } from '@dossier/controle/controle.model';
import { createTestFctAssainissement, createTestAnalyse } from '../../../fixtures/fctAssainissement.fixture';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DEPOT_ID = '00000000-0000-0000-0000-000000000001';
/** Helper: extract only the error rows (success=false) for a given ControleName */
function findControleErrors(results: ControleModel[], name: ControleName): ControleModel[] {
  return results.filter((r) => r.name === name && !r.success);
}

describe('ControleMetierV2Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let controleMetierV2Service: ControleMetierV2Service;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), CacheModule.register()],
      providers: [
        LoggerService,
        ControleMetierV2Service,
        ControleMetierV2Pfas,
        ControleMapper,
        ControleRepository,
        RoseauRepository,
        RoseauReferentielPointMesureRepository,
        RoseauBilanRepository,
        RoseauConformiteRepository,
        RoseauEvenementRepository,
        LanceleauRepository,
        MasaProvider,
        { provide: ControleGateway, useExisting: ControleRepository },
        { provide: RoseauGateway, useExisting: RoseauRepository },
        { provide: RoseauReferentielPointMesureGateway, useExisting: RoseauReferentielPointMesureRepository },
        { provide: RoseauBilanGateway, useExisting: RoseauBilanRepository },
        { provide: RoseauConformiteGateway, useExisting: RoseauConformiteRepository },
        { provide: RoseauEvenementGateway, useExisting: RoseauEvenementRepository },
        RoseauTransmissionRepository,
        { provide: RoseauTransmissionGateway, useExisting: RoseauTransmissionRepository },
        RoseauMesureDeposeeRepository,
        { provide: RoseauMesureDeposeeGateway, useExisting: RoseauMesureDeposeeRepository },
        { provide: LanceleauGateway, useExisting: LanceleauRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(getDataSourceToken());
    controleMetierV2Service = moduleFixture.get(ControleMetierV2Service);

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

    // Seed a depot for the execute() calls
    await seedDepot(dataSource, TEST_DEPOT_ID);
  });

  describe('filterFctAssainissementForMetierV2', () => {
    it('should keep only locGlobalePointMesure A3/A4 and cdSupport=3', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU_FILTER',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3_KEEP',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '1')],
                  },
                  {
                    datePrlvt: '2024-01-02',
                    cdSupport: '33',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '2')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4_KEEP',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-03',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '3')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_S7_DROP',
                locGlobalePointMesure: 'S7',
                prelevement: [
                  {
                    datePrlvt: '2024-01-04',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '4')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const filterOptions: FilterFctAssainissementForMetierVOptions = {
        allowedLocGlobalePointMesure: ['A3', 'A4'],
        allowedCdSupport: '3',
      };
      const filtered = filterFctAssainissementForMetierV2(fctAssainissement, filterOptions);

      expect(filtered.ouvrages).toHaveLength(1);
      expect(filtered.ouvrages[0].pointMesure.map((pm) => pm.numeroPointMesure)).toEqual(['PM_A3_KEEP', 'PM_A4_KEEP']);
      expect(filtered.ouvrages[0].pointMesure[0].prelevement).toHaveLength(1);
      expect(filtered.ouvrages[0].pointMesure[0].prelevement[0].cdSupport).toBe('3');
    });
  });

  describe('CTL041 - verifyDcoRange', () => {
    it('should pass when DCO is within valid range (300 < DCO < 1700)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '500')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL041);

      expect(ctlErrors).toHaveLength(0);
    });

    it('should report error when DCO is too low (DCO <= 300)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '300')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL041);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_041);
      expect(ctlErrors[0].errorParams).toEqual(['STEU001', 'A3', '2024-01-15', '3', '300']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO is too high (DCO >= 1700)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '1700')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL041);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_041);
      expect(ctlErrors[0].errorParams).toEqual(['STEU002', 'A3', '2024-01-16', '3', '1700']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should not persist CTL041 when no DCO is applicable', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '1700')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL041)).toHaveLength(0);
    });
  });

  describe('CTL042 - verifyDbo5Range', () => {
    it('should pass when DBO5 is within valid range (150 < DBO5 < 800)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '400')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL042);

      expect(ctlErrors).toHaveLength(0);
    });

    it('should report error when DBO5 is too low (DBO5 <= 150)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '150')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL042);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_042);
      expect(ctlErrors[0].errorParams).toEqual(['STEU001', 'A3', '2024-01-15', '3', '150']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DBO5 is too high (DBO5 >= 800)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '800')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL042);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_042);
      expect(ctlErrors[0].errorParams).toEqual(['STEU002', 'A3', '2024-01-16', '3', '800']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should not report error when DBO5 is out of range on A4', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '800')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL042);

      expect(ctlErrors).toHaveLength(0);
    });
  });

  describe('CTL052 - verifyCmaComparisonForDcoDbo5', () => {
    it('should pass when DBO5 and DCO are lower than CMA N-1', async () => {
      await seedSteu(dataSource, 1, 'STEU001');
      await seedResa(dataSource, 1, 1, 2023, '1313', 100);
      await seedResa(dataSource, 2, 1, 2023, '1314', 200);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01', // Year N = 2024, so N-1 = 2023
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DBO5.toString(), '99'),
                      createTestAnalyse(CodeParametre.DCO.toString(), '199'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(0);
    });

    it('should report error when DBO5 exceeds CMA N-1', async () => {
      await seedSteu(dataSource, 2, 'STEU002');
      // Seed CMA for DBO5 = 150 mg/L
      await seedResa(dataSource, 3, 2, 2023, '1313', 150);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-02-10',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '166')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_052);
      expect(ctlErrors[0].errorParams).toEqual(['DBO5', 'STEU002', '2024-02-10', '166.00', '150.00']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO exceeds CMA N-1', async () => {
      await seedSteu(dataSource, 3, 'STEU003');
      // Seed CMA for DCO = 300 mg/L
      await seedResa(dataSource, 4, 3, 2023, '1314', 300);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [
              {
                numeroPointMesure: 'PM003',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-03-05',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '301'), // +50% from CMA (300), exceeds 30%
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_052);
      expect(ctlErrors[0].errorParams).toEqual(['DCO', 'STEU003', '2024-03-05', '301.00', '300.00']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should not persist CTL052 when no CMA data exists for year N-1', async () => {
      await seedSteu(dataSource, 4, 'STEU004');
      // No RESA data - no CMA available

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [
              {
                numeroPointMesure: 'PM004',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-04-12',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DBO5.toString(), '500'), // High value but no CMA to compare
                      createTestAnalyse(CodeParametre.DCO.toString(), '1000'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL052)).toHaveLength(0);
    });

    it('should not report error when dateDebutReference is missing', async () => {
      await seedSteu(dataSource, 5, 'STEU005');
      await seedResa(dataSource, 5, 5, 2023, '1313', 100);

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU005',
            pointMesure: [
              {
                numeroPointMesure: 'PM005',
                locGlobalePointMesure: 'A3',
                // dateDebutReference: undefined - not set, should skip control
                prelevement: [
                  {
                    datePrlvt: '2024-05-20',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '200')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_052);
      expect(ctlErrors[0].errorParams).toEqual([undefined]);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report two errors when both DBO5 and DCO exceed CMA N-1', async () => {
      await seedSteu(dataSource, 6, 'STEU006');
      // Seed CMA for DBO5 = 100 and DCO = 200
      await seedResa(dataSource, 6, 6, 2023, '1313', 100);
      await seedResa(dataSource, 7, 6, 2023, '1314', 200);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU006',
            pointMesure: [
              {
                numeroPointMesure: 'PM006',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-06-01',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DBO5.toString(), '111'),
                      createTestAnalyse(CodeParametre.DCO.toString(), '201'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(2);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_052);
      expect(ctlErrors[0].errorParams).toEqual(['DBO5', 'STEU006', '2024-06-01', '111.00', '100.00']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
      expect(ctlErrors[1].error).toBe(ErrorCode.E2_052);
      expect(ctlErrors[1].errorParams).toEqual(['DCO', 'STEU006', '2024-06-01', '201.00', '200.00']);
      expect(ctlErrors[1].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should not report error when DBO5 and DCO equal CMA N-1 exactly', async () => {
      await seedSteu(dataSource, 7, 'STEU007');
      // Seed CMA for DBO5 = 150 and DCO = 300
      await seedResa(dataSource, 8, 7, 2023, '1313', 150);
      await seedResa(dataSource, 9, 7, 2023, '1314', 300);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU007',
            pointMesure: [
              {
                numeroPointMesure: 'PM007',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-07-10',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DBO5.toString(), '150'), // exactly at CMA
                      createTestAnalyse(CodeParametre.DCO.toString(), '300'), // exactly at CMA
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(0); // Equal to CMA is not a violation (only strictly >)
    });

    it('should not check prelevement on A4 point de mesure (only A3 is checked)', async () => {
      await seedSteu(dataSource, 8, 'STEU008');
      // Seed CMA for DBO5 = 100
      await seedResa(dataSource, 10, 8, 2023, '1313', 100);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU008',
            pointMesure: [
              {
                numeroPointMesure: 'PM008_A4',
                locGlobalePointMesure: 'A4', // A4 should be skipped
                prelevement: [
                  {
                    datePrlvt: '2024-08-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '999')], // Exceeds CMA but on A4
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL052);

      expect(ctlErrors).toHaveLength(0); // A4 is not checked by CTL052
    });
  });

  describe('CTL046 - verifyPhRange', () => {
    it('should pass when pH is within valid range (4 < pH < 10)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '7')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL046);

      expect(ctlErrors).toHaveLength(0);
    });

    it('should report ERREUR when pH is too low (pH <= 2)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '2')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL046);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_046);
      expect(ctlErrors[0].errorParams).toEqual(['STEU001', 'A4', '2024-01-15', '3', '2']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.ERREUR);
    });

    it('should report ERREUR when pH is too high (pH >= 12)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '12')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL046);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_046);
      expect(ctlErrors[0].errorParams).toEqual(['STEU002', 'A4', '2024-01-16', '3', '12']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.ERREUR);
    });

    it('should report AVERTISSEMENT when pH is in warning range low (2 < pH <= 4)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '3')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL046);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_046);
      expect(ctlErrors[0].errorParams).toEqual(['STEU001', 'A4', '2024-01-15', '3', '3']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report AVERTISSEMENT when pH is in warning range high (10 <= pH < 12)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM002',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '11')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL046);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_046);
      expect(ctlErrors[0].errorParams).toEqual(['STEU002', 'A4', '2024-01-16', '3', '11']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL047 - verifyDcoGreaterThanDbo5', () => {
    it('should pass when DCO > DBO5', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '500'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '200'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL047);

      expect(ctlErrors).toHaveLength(0);
    });

    it('should report error when DCO <= DBO5', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '200'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '250'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL047);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_047);
      expect(ctlErrors[0].errorParams).toEqual(['STEU001', 'A3', '2024-01-15', '3', '200', '250']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO equals DBO5', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '200'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '200'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL047);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_047);
      expect(ctlErrors[0].errorParams).toEqual(['STEU001', 'A3', '2024-01-15', '3', '200', '200']);
    });

    it('should not report error when only one parameter is present', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM001',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '200')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL047);

      expect(ctlErrors).toHaveLength(0);
    });
  });

  describe('CTL051 - verifyVolumeA3A4VsCapaciteEH', () => {
    it('should pass when volumes are below threshold (capaciteEH * 0.2 * 6)', async () => {
      // capaciteEH = 3000 (> 2000), seuil = 3000 * 0.2 * 6 = 3600
      await seedSteu(dataSource, 1, 'STEU001');
      await seedCpy(dataSource, 1, 1, 2024, 3000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '3000')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '3000')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const controles = results.filter((result) => result.name === ControleName.CTL051);

      expect(controles).toHaveLength(1);
      expect(controles[0].success).toBe(true);
    });

    it('should report error when volumes exceed threshold', async () => {
      // capaciteEH = 3000, seuil = 3600
      await seedSteu(dataSource, 2, 'STEU002');
      await seedCpy(dataSource, 2, 2, 2024, 3000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '4000')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '3500')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL051);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_051);
      expect(ctlErrors[0].errorParams).toEqual([
        'STEU002',
        '2024-01-15',
        '3600.00',
        '4000',
        '\u2265', // >=
        '3500',
        '<',
      ]);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should skip when capaciteEH <= 2000', async () => {
      await seedSteu(dataSource, 3, 'STEU003');
      await seedCpy(dataSource, 3, 3, 2024, 2000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '99999')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '99999')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL051)).toHaveLength(0);
    });

    it('should skip when capaciteEH is null (STEU not found)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU_UNKNOWN',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '99999')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '99999')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL051)).toHaveLength(0);
    });

    it('should report error when dateDebutReference is missing', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '5000')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL051);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_051);
      expect(ctlErrors[0].errorParams).toEqual([undefined]);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should only check when both A3 and A4 volumes are present for the same date', async () => {
      // capaciteEH = 3000, seuil = 3600
      await seedSteu(dataSource, 4, 'STEU004');
      await seedCpy(dataSource, 4, 4, 2024, 3000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '99999')],
                  },
                ],
              },
              // No A4 point de mesure
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL051)).toHaveLength(0);
    });
  });

  /////

  describe('CTL054 - verifyChargeEntranteVsTranche', () => {
    it('should pass when variation between N and N-1 is within 20%', async () => {
      // N = 9000, N-1 = 8000 => variation = 12.5% => OK
      await seedSteu(dataSource, 1, 'STEU001', { zgcCdn: 100, steuEncoursAn: 2024 });
      await seedTltobl(dataSource, '2', 'De 2 000 à 10 000 EH');
      await seedAga(dataSource, 1, 100, 'AGA001', '2');
      await seedAgac(dataSource, 1, 2024);
      await seedStchan(dataSource, 1, 2024, null, 9000);
      await seedStchan(dataSource, 1, 2023, null, 8000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result!.name).toBe(ControleName.CTL054);
      expect(result!.errors).toHaveLength(0);
    });

    it('should report error when variation exceeds +20%', async () => {
      // N = 12000, N-1 = 8000 => variation = 50% => AVERTISSEMENT
      await seedSteu(dataSource, 2, 'STEU002', { zgcCdn: 200, steuEncoursAn: 2024 });
      await seedTltobl(dataSource, '2', 'De 2 000 à 10 000 EH');
      await seedAga(dataSource, 2, 200, 'AGA002', '2');
      await seedAgac(dataSource, 2, 2024);
      await seedStchan(dataSource, 2, 2024, null, 12000);
      await seedStchan(dataSource, 2, 2023, null, 8000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU002',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result!.name).toBe(ControleName.CTL054);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result!.errors[0].params).toEqual(['STEU002', '12000', '8000', 'De 2 000 à 10 000 EH', '50.0']);
      expect(result!.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when variation exceeds -20% (decrease)', async () => {
      // N = 3000, N-1 = 8000 => variation = -62.5% => |variation| = 62.5% => AVERTISSEMENT
      await seedSteu(dataSource, 3, 'STEU003', { zgcCdn: 300, steuEncoursAn: 2024 });
      await seedTltobl(dataSource, '1', 'Moins de 2 000 EH');
      await seedAga(dataSource, 3, 300, 'AGA003', '1');
      await seedAgac(dataSource, 3, 2024);
      await seedStchan(dataSource, 3, 2024, null, 3000);
      await seedStchan(dataSource, 3, 2023, null, 8000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result!.name).toBe(ControleName.CTL054);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result!.errors[0].params).toEqual(['STEU003', '3000', '8000', 'Moins de 2 000 EH', '62.5']);
    });

    it('should skip when no N-1 data exists for the ouvrage', async () => {
      // Only year N data, no N-1 => query returns nothing => no error
      await seedSteu(dataSource, 4, 'STEU004', { zgcCdn: 400, steuEncoursAn: 2024 });
      await seedTltobl(dataSource, '4', 'Plus de 100 000 EH');
      await seedAga(dataSource, 4, 400, 'AGA004', '4');
      await seedAgac(dataSource, 4, 2024);
      await seedStchan(dataSource, 4, 2024, null, 999999);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result).toBeNull();
    });

    it('should skip when dateDebutReference is missing', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result).toBeNull();
    });

    it('should skip when no referentiel data exists for the ouvrage', async () => {
      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU_UNKNOWN',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result).toBeNull();
    });

    it('should report error for variation exactly at boundary (>20%)', async () => {
      // N = 6100, N-1 = 5000 => variation = 22% => AVERTISSEMENT
      await seedSteu(dataSource, 5, 'STEU005', { zgcCdn: 500, steuEncoursAn: 2024 });
      await seedTltobl(dataSource, '3', 'De 10 000 à 100 000 EH');
      await seedAga(dataSource, 5, 500, 'AGA005', '3');
      await seedAgac(dataSource, 5, 2024);
      await seedStchan(dataSource, 5, 2024, null, 6100);
      await seedStchan(dataSource, 5, 2023, null, 5000);

      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU005',
            pointMesure: [],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyChargeEntranteVsTranche(fctAssainissement);

      expect(result!.name).toBe(ControleName.CTL054);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result!.errors[0].params).toEqual(['STEU005', '6100', '5000', 'De 10 000 à 100 000 EH', '22.0']);
      expect(result!.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL061 - verifyDebitA3A4SameDate', () => {
    it('should pass when A3 and A4 have 1552 at the same date', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '1000')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '800')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const controles = results.filter((result) => result.name === ControleName.CTL061);

      expect(controles).toHaveLength(1);
      expect(controles[0].success).toBe(true);
    });

    it('should warn when A4 exists at a date but A3 does not (A3 missing)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse('9999', '100')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '800')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL061);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_061);
      expect(ctlErrors[0].errorParams).toEqual(['A3', '2024-01-15']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should warn when A3 exists at a date but A4 does not (A4 missing)', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '1000')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse('9999', '100')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL061);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_061);
      expect(ctlErrors[0].errorParams).toEqual(['A4', '2024-01-15']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should warn twice when A3 and A4 are on different dates', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-14',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '1000')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '800')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL061);

      expect(ctlErrors).toHaveLength(2);
      expect(ctlErrors.map((e) => e.errorParams)).toEqual(
        expect.arrayContaining([
          ['A4', '2024-01-14'],
          ['A3', '2024-01-15'],
        ]),
      );
      ctlErrors.forEach((e) => {
        expect(e.evenementType).toBe(EvenementType.AVERTISSEMENT);
      });
    });

    it('should ignore parameters other than 1552', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '500')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '200')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL061)).toHaveLength(0);
    });

    it('should not persist CTL061 when A3 and A4 both lack 1552 entirely', async () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU001',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '500')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '200')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      expect(results.filter((result) => result.name === ControleName.CTL061)).toHaveLength(0);
    });

    it('should parse real XML and pass when A3 and A4 have 1552 at the same date', async () => {
      const xmlPath = path.join(__dirname, '..', '..', '..', 'fixtures', 'xml', 'ctl061-a3-a4-meme-date.xml');
      const xml = fs.readFileSync(xmlPath, 'utf-8');
      const fctAssainissement = await parseScenarioAssainissementXml(xml);

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL061);

      expect(ctlErrors).toHaveLength(0);
    });

    it('should parse real XML and warn when A4 has 1552 on a date without A3', async () => {
      const xmlPath = path.join(__dirname, '..', '..', '..', 'fixtures', 'xml', 'ctl061-a4-sans-a3.xml');
      const xml = fs.readFileSync(xmlPath, 'utf-8');
      const fctAssainissement = await parseScenarioAssainissementXml(xml);

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);
      const ctlErrors = findControleErrors(results, ControleName.CTL061);

      expect(ctlErrors).toHaveLength(1);
      expect(ctlErrors[0].error).toBe(ErrorCode.E2_061);
      expect(ctlErrors[0].errorParams).toEqual(['A3', '2024-06-15']);
      expect(ctlErrors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('PFAS controls CTL201-CTL210', () => {
    const pfasControlNames = [
      ControleName.CTL201,
      ControleName.CTL202,
      ControleName.CTL203,
      ControleName.CTL204,
      ControleName.CTL205,
      ControleName.CTL207,
      ControleName.CTL208,
      ControleName.CTL209,
      ControleName.CTL210,
    ];

    async function executePfasFixture(capacity: number) {
      await seedSteu(dataSource, 201, 'CD_OUVRAGE_1');
      await seedCpy(dataSource, 201, 201, 2026, capacity);

      const xmlPath = path.join(__dirname, '..', '..', '..', 'fixtures', 'xml', 'pfas_anonymized.xml');
      const fctAssainissement = await parseScenarioAssainissementXml(fs.readFileSync(xmlPath, 'utf-8'));
      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);

      return results
        .filter((result) => pfasControlNames.includes(result.name))
        .map(({ name, success, error, errorParams, evenementType }) => ({
          name,
          success,
          error: error ?? null,
          errorParams: errorParams ?? null,
          evenementType: evenementType ?? null,
        }));
    }

    it('should persist the characterized PFAS results at exactly 10000 EH', async () => {
      const results = await executePfasFixture(10000);

      expect(results).toEqual([
        {
          name: ControleName.CTL201,
          success: true,
          error: null,
          errorParams: null,
          evenementType: null,
        },
        {
          name: ControleName.CTL202,
          success: false,
          error: ErrorCode.E2_202,
          errorParams: ['2026-03-09'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
        {
          name: ControleName.CTL203,
          success: false,
          error: ErrorCode.E2_203,
          errorParams: ['2026-03-09'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
        {
          name: ControleName.CTL204,
          success: true,
          error: null,
          errorParams: null,
          evenementType: null,
        },
        {
          name: ControleName.CTL205,
          success: true,
          error: null,
          errorParams: null,
          evenementType: null,
        },
        {
          name: ControleName.CTL207,
          success: false,
          error: ErrorCode.E2_207,
          errorParams: ['8986, 7991'],
          evenementType: EvenementType.INFORMATION,
        },
        {
          name: ControleName.CTL208,
          success: false,
          error: ErrorCode.E2_208,
          errorParams: ['22', '2026-03-09', '8858'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
        {
          name: ControleName.CTL208,
          success: false,
          error: ErrorCode.E2_208,
          errorParams: ['22', '2026-03-09', '8858'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
        {
          name: ControleName.CTL209,
          success: true,
          error: null,
          errorParams: null,
          evenementType: null,
        },
        {
          name: ControleName.CTL210,
          success: false,
          error: ErrorCode.E2_210,
          errorParams: ['2026-03-09', 'Fluorure, Carbone organique'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
      expect(results.map((result) => result.name)).toEqual([
        ControleName.CTL201,
        ControleName.CTL202,
        ControleName.CTL203,
        ControleName.CTL204,
        ControleName.CTL205,
        ControleName.CTL207,
        ControleName.CTL208,
        ControleName.CTL208,
        ControleName.CTL209,
        ControleName.CTL210,
      ]);
    });

    it('should not persist PFAS controls below 10000 EH', async () => {
      await expect(executePfasFixture(9999)).resolves.toEqual([]);
    });
  });

  describe('non-applicable controls with missing values', () => {
    it('should persist only CTL055 when no other control has evaluable data', async () => {
      const fctAssainissement = createTestFctAssainissement({
        scenario: {
          emetteur: {},
          codeScenario: SandreScenarioCode.FCT_ASSAIN,
          versionScenario: SandreScenarioVersion.V4,
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU_WITHOUT_REFERENCE',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse('9999', '100')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse('9999', '100')],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL_WITHOUT_VALUES',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A1',
                locGlobalePointMesure: 'A1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse('9999', '100')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const results = await controleMetierV2Service.execute(TEST_DEPOT_ID, fctAssainissement);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: ControleName.CTL055, success: true });
    });
  });
});
