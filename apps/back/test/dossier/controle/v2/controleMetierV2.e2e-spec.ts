import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { ControleMapper } from '@dossier/controle/isov1/controle.mapper';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ControleRepository } from '@dossier/controle/controle.repository';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauRepository } from '@referentiel/roseau/roseau.repository';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LanceleauRepository } from '@referentiel/lanceleau/lanceleau.repository';
import { ControleMetierV2Service } from '@dossier/controle/metierv2/controleMetierV2.service';
import { filterFctAssainissementForMetierV2 } from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';
import { CodeParametre, CodeUniteMesure } from '@referentiel/parametre/codeParametre';

import { ControleName, ErrorCode, EvenementType } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';
import { startPostgresContainer, getPostgresConnectionUri } from '../../../testcontainer.config';
import {
  createReferentielDataset,
  clearReferentielData,
  seedStchan,
  seedCpy,
  seedAga,
  seedTltobl,
} from '../../../createReferentielDataset';
import { clearDepots } from '../../../depot.helper';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';
import { initTestContainerImports } from '../../../init/initTestContainer';

// Import shared fixtures
import { createTestFctAssainissement, createTestAnalyse } from '../../../fixtures/fctAssainissement.fixture';

describe('ControleMetierV2Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let controleMetierV2Service: ControleMetierV2Service;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri)],
      providers: [
        LoggerService,
        ControleMetierV2Service,
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

      const filtered = filterFctAssainissementForMetierV2(fctAssainissement);

      expect(filtered.ouvrages).toHaveLength(1);
      expect(filtered.ouvrages[0].pointMesure.map((pm) => pm.numeroPointMesure)).toEqual(['PM_A3_KEEP', 'PM_A4_KEEP']);
      expect(filtered.ouvrages[0].pointMesure[0].prelevement).toHaveLength(1);
      expect(filtered.ouvrages[0].pointMesure[0].prelevement[0].cdSupport).toBe('3');
    });
  });

  describe('CTL039 - verifyRatioDcoDbo5', () => {
    it('should pass when DCO/DBO5 ratio is within valid range (1.5 < ratio < 3.5)', () => {
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
                      createTestAnalyse(CodeParametre.DCO.toString(), '50'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when DCO/DBO5 ratio is too low (ratio <= 1.5)', () => {
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
                      createTestAnalyse(CodeParametre.DCO.toString(), '30'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '30', '20', '1.50']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO/DBO5 ratio is too high (ratio >= 3.5)', () => {
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
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '70'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '70', '20', '3.50']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should handle multiple groups with different validation results', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU007',
            pointMesure: [
              {
                numeroPointMesure: 'PM007',
                prelevement: [
                  // Valid ratio
                  {
                    datePrlvt: '2024-01-21',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '50'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                  // Invalid ratio (too low)
                  {
                    datePrlvt: '2024-01-22',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '30'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                  // Invalid ratio (too high)
                  {
                    datePrlvt: '2024-01-23',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '80'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(2);

      // Check first error (ratio too low)
      expect(result.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result.errors[0].params[0]).toBe('STEU007');
      expect(result.errors[0].params[2]).toBe('2024-01-22');
      expect(result.errors[0].params[6]).toBe('1.50');

      // Check second error (ratio too high)
      expect(result.errors[1].code).toBe(ErrorCode.E2_039);
      expect(result.errors[1].params[0]).toBe('STEU007');
      expect(result.errors[1].params[2]).toBe('2024-01-23');
      expect(result.errors[1].params[6]).toBe('4.00');
    });

    it('should handle multiple ouvrages with different point de mesure', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU008',
            pointMesure: [
              {
                numeroPointMesure: 'PM008A',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-24',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '30'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM008B',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-24',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '80'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            cdOuvrageDepollution: 'STEU009',
            pointMesure: [
              {
                numeroPointMesure: 'PM009',
                prelevement: [
                  {
                    datePrlvt: '2024-01-24',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '60'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(2);

      // Check errors are for different point de mesure (using locGlobalePointMesure)
      const ouvragesPMCombos = result.errors.map((e) => `${e.params[0]}-${e.params[1]}`);
      expect(ouvragesPMCombos).toContain('STEU008-A3');
      expect(ouvragesPMCombos).toContain('STEU008-A4');
    });

    it('should group analyses by the same (ouvrage, point_mesure, date, support) combination', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU010',
            pointMesure: [
              {
                numeroPointMesure: 'PM010',
                prelevement: [
                  {
                    datePrlvt: '2024-01-25',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '30'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '20'),
                      createTestAnalyse('1305', '15'), // MES (should be ignored)
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].params[6]).toBe('1.50'); // Ratio DCO/DBO5
    });

    it('should handle empty ouvrages array', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [],
      });

      const result = controleMetierV2Service.verifyRatioDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('CTL040 - verifyRatioMesDbo5', () => {
    it('should pass when MES/DBO5 ratio is within valid range (0.7 < ratio < 1.5)', () => {
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
                      createTestAnalyse(CodeParametre.MES.toString(), '10'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '10'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioMesDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL040);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when MES/DBO5 ratio is too low (ratio <= 0.7)', () => {
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
                      createTestAnalyse(CodeParametre.MES.toString(), '7'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '10'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioMesDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL040);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_040);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '7', '10', '0.70']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when MES/DBO5 ratio is too high (ratio >= 1.5)', () => {
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
                    analyse: [
                      createTestAnalyse(CodeParametre.MES.toString(), '15'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '10'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioMesDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL040);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_040);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '15', '10', '1.50']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should group analyses by the same (ouvrage, point_mesure, date, support) combination', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU010',
            pointMesure: [
              {
                numeroPointMesure: 'PM010',
                prelevement: [
                  {
                    datePrlvt: '2024-01-25',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.MES.toString(), '7'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '10'),
                      createTestAnalyse(CodeParametre.DCO.toString(), '50'), // DCO (should be ignored)
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyRatioMesDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL040);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].params[6]).toBe('0.70'); // Ratio MES/DBO5
    });
  });

  describe('CTL041 - verifyDcoRange', () => {
    it('should pass when DCO is within valid range (300 < DCO < 1700)', () => {
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

      const result = controleMetierV2Service.verifyDcoRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL041);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when DCO is too low (DCO <= 300)', () => {
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

      const result = controleMetierV2Service.verifyDcoRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL041);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_041);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '300']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO is too high (DCO >= 1700)', () => {
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

      const result = controleMetierV2Service.verifyDcoRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL041);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_041);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '1700']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL042 - verifyDbo5Range', () => {
    it('should pass when DBO5 is within valid range (150 < DBO5 < 800)', () => {
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

      const result = controleMetierV2Service.verifyDbo5Range(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL042);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when DBO5 is too low (DBO5 <= 150)', () => {
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

      const result = controleMetierV2Service.verifyDbo5Range(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL042);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_042);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '150']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DBO5 is too high (DBO5 >= 800)', () => {
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

      const result = controleMetierV2Service.verifyDbo5Range(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL042);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_042);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '800']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL052 - verifyCmaComparisonForDcoDbo5', () => {
    it('should pass when DBO5 and DCO are lower than CMA N-1', async () => {
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (1, 'STEU001')
      `);

      await dataSource.query(`
        INSERT INTO roseau.resa (resa_cdn, steu_cdn, resa_an, par_rfa, resa_cma_val)
        VALUES (1, 1, 2023, '1313', 100)
      `);
      await dataSource.query(`
        INSERT INTO roseau.resa (resa_cdn, steu_cdn, resa_an, par_rfa, resa_cma_val)
        VALUES (2, 1, 2023, '1314', 200)
      `);

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

      const result = await controleMetierV2Service.verifyCmaComparisonForDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when DBO5 exceeds CMA N-1', async () => {
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (2, 'STEU002')
      `);

      // Seed CMA for DBO5 = 150 mg/L
      await dataSource.query(`
        INSERT INTO roseau.resa (resa_cdn, steu_cdn, resa_an, par_rfa, resa_cma_val)
        VALUES (3, 2, 2023, '1313', 150)
      `);

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
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '151')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyCmaComparisonForDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
      expect(result.errors[0].params).toEqual(['DBO5', 'STEU002', '2024-02-10', '151.00', '150.00']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO exceeds CMA N-1', async () => {
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (3, 'STEU003')
      `);

      // Seed CMA for DCO = 300 mg/L
      await dataSource.query(`
        INSERT INTO roseau.resa (resa_cdn, steu_cdn, resa_an, par_rfa, resa_cma_val)
        VALUES (4, 3, 2023, '1314', 300)
      `);

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

      const result = await controleMetierV2Service.verifyCmaComparisonForDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
      expect(result.errors[0].params).toEqual(['DCO', 'STEU003', '2024-03-05', '301.00', '300.00']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should not report error when no CMA data exists for year N-1', async () => {
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (4, 'STEU004')
      `);

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

      const result = await controleMetierV2Service.verifyCmaComparisonForDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(0); // Should skip gracefully when no CMA data
    });

    it('should not report error when dateDebutReference is missing', async () => {
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (5, 'STEU005')
      `);

      await dataSource.query(`
        INSERT INTO roseau.resa (resa_cdn, steu_cdn, resa_an, par_rfa, resa_cma_val)
        VALUES (5, 5, 2023, '1313', 100)
      `);

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

      const result = await controleMetierV2Service.verifyCmaComparisonForDcoDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
      expect(result.errors[0].params).toEqual([undefined]);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL043 - verifyMesRange', () => {
    it('should pass when MES is within valid range (100 < MES < 1200)', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.MES.toString(), '500')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyMesRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL043);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when MES is too low (MES <= 100)', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.MES.toString(), '100')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyMesRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL043);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_043);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '100']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when MES is too high (MES >= 1200)', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.MES.toString(), '1200')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyMesRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL043);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_043);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '1200']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL044 - verifyNtkRange', () => {
    it('should pass when NTK is within valid range (20 < NTK < 160) with correct unit', () => {
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
                      createTestAnalyse(CodeParametre.NTK.toString(), '50', {
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(),
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL044);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when NTK is too low (NTK <= 20)', () => {
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
                      createTestAnalyse(CodeParametre.NTK.toString(), '20', {
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(),
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL044);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_044);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '20']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when NTK is too high (NTK >= 160)', () => {
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
                    analyse: [
                      createTestAnalyse(CodeParametre.NTK.toString(), '160', {
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(),
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL044);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_044);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '160']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should skip NTK with wrong unit (not mg(N)/L)', () => {
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
                      createTestAnalyse(CodeParametre.NTK.toString(), '5', {
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(), // wrong unit
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL044);
      expect(result.errors).toHaveLength(0); // Skipped because unit doesn't match
    });
  });

  describe('CTL045 - verifyPtotRange', () => {
    it('should pass when Ptot is within valid range (4 < Ptot < 25) with correct unit', () => {
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
                      createTestAnalyse(CodeParametre.Ptot.toString(), '10', {
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(),
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPtotRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL045);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when Ptot is too low (Ptot <= 4)', () => {
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
                      createTestAnalyse(CodeParametre.Ptot.toString(), '4', {
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(),
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPtotRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL045);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_045);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '4']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when Ptot is too high (Ptot >= 25)', () => {
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
                    analyse: [
                      createTestAnalyse(CodeParametre.Ptot.toString(), '25', {
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(),
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPtotRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL045);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_045);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '25']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should skip Ptot with wrong unit (not mg/L)', () => {
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
                      createTestAnalyse(CodeParametre.Ptot.toString(), '1', {
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(), // wrong unit
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPtotRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL045);
      expect(result.errors).toHaveLength(0); // Skipped because unit doesn't match
    });
  });

  describe('CTL046 - verifyPhRange', () => {
    it('should pass when pH is within valid range (2 < pH < 12)', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '7')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPhRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL046);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when pH is too low (pH <= 2)', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '2')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPhRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL046);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_046);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '2']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when pH is too high (pH >= 12)', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.pH.toString(), '12')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPhRange(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL046);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_046);
      expect(result.errors[0].params).toEqual(['STEU002', 'A3', '2024-01-16', '3', '12']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });

  describe('CTL047 - verifyDcoGreaterThanDbo5', () => {
    it('should pass when DCO > DBO5', () => {
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

      const result = controleMetierV2Service.verifyDcoGreaterThanDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL047);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when DCO <= DBO5', () => {
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

      const result = controleMetierV2Service.verifyDcoGreaterThanDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL047);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_047);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '200', '250']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO equals DBO5', () => {
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

      const result = controleMetierV2Service.verifyDcoGreaterThanDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL047);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_047);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '200', '200']);
    });

    it('should not report error when only one parameter is present', () => {
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

      const result = controleMetierV2Service.verifyDcoGreaterThanDbo5(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL047);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('CTL048 - verifyNtkGreaterThanNnh4', () => {
    it('should pass when NTK > N-NH4', () => {
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
                      createTestAnalyse(CodeParametre.NTK.toString(), '50'),
                      createTestAnalyse(CodeParametre.N_NH4.toString(), '30'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkGreaterThanNnh4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL048);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when NTK <= N-NH4', () => {
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
                      createTestAnalyse(CodeParametre.NTK.toString(), '30'),
                      createTestAnalyse(CodeParametre.N_NH4.toString(), '40'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkGreaterThanNnh4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL048);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_048);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '30', '40']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when NTK equals N-NH4', () => {
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
                      createTestAnalyse(CodeParametre.NTK.toString(), '40'),
                      createTestAnalyse(CodeParametre.N_NH4.toString(), '40'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNtkGreaterThanNnh4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL048);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_048);
    });
  });

  describe('CTL049 - verifyNglGreaterThanNtk', () => {
    it('should pass when NGL > NTK', () => {
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
                      createTestAnalyse(CodeParametre.NGL.toString(), '80'),
                      createTestAnalyse(CodeParametre.NTK.toString(), '50'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNglGreaterThanNtk(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL049);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when NGL <= NTK', () => {
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
                      createTestAnalyse(CodeParametre.NGL.toString(), '40'),
                      createTestAnalyse(CodeParametre.NTK.toString(), '50'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNglGreaterThanNtk(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL049);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_049);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '40', '50']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when NGL equals NTK', () => {
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
                      createTestAnalyse(CodeParametre.NGL.toString(), '50'),
                      createTestAnalyse(CodeParametre.NTK.toString(), '50'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyNglGreaterThanNtk(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL049);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_049);
    });
  });

  describe('CTL050 - verifyPGreaterThanPO4', () => {
    it('should pass when Ptot > PO4', () => {
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
                      createTestAnalyse(CodeParametre.Ptot.toString(), '15'),
                      createTestAnalyse(CodeParametre.PO4.toString(), '8'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPGreaterThanPO4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL050);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when Ptot <= PO4', () => {
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
                      createTestAnalyse(CodeParametre.Ptot.toString(), '5'),
                      createTestAnalyse(CodeParametre.PO4.toString(), '8'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPGreaterThanPO4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL050);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_050);
      expect(result.errors[0].params).toEqual(['STEU001', 'A3', '2024-01-15', '3', '5', '8']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when Ptot equals PO4', () => {
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
                      createTestAnalyse(CodeParametre.Ptot.toString(), '10'),
                      createTestAnalyse(CodeParametre.PO4.toString(), '10'),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPGreaterThanPO4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL050);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_050);
    });

    it('should not report error when only one parameter is present', () => {
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
                    analyse: [createTestAnalyse(CodeParametre.Ptot.toString(), '5')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = controleMetierV2Service.verifyPGreaterThanPO4(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL050);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('CTL051 - verifyVolumeA3A4VsCapaciteEH', () => {
    it('should pass when volumes are below threshold (capaciteEH * 0.2 * 6)', async () => {
      // capaciteEH = 3000 (> 2000), seuil = 3000 * 0.2 * 6 = 3600
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (1, 'STEU001')
      `);
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

      const result = await controleMetierV2Service.verifyVolumeA3A4VsCapaciteEH(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when volumes exceed threshold', async () => {
      // capaciteEH = 3000, seuil = 3600
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (2, 'STEU002')
      `);
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

      const result = await controleMetierV2Service.verifyVolumeA3A4VsCapaciteEH(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual([
        'STEU002',
        '2024-01-15',
        '3600.00',
        '4000',
        '\u2265', // ≥
        '3500',
        '<',
      ]);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should skip when capaciteEH <= 2000', async () => {
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (3, 'STEU003')
      `);
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

      const result = await controleMetierV2Service.verifyVolumeA3A4VsCapaciteEH(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(0);
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

      const result = await controleMetierV2Service.verifyVolumeA3A4VsCapaciteEH(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(0);
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

      const result = await controleMetierV2Service.verifyVolumeA3A4VsCapaciteEH(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual([undefined]);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should only check when both A3 and A4 volumes are present for the same date', async () => {
      // capaciteEH = 3000, seuil = 3600
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
        VALUES (4, 'STEU004')
      `);
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

      const result = await controleMetierV2Service.verifyVolumeA3A4VsCapaciteEH(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(0); // No error because A4 volume is missing
    });
  });

  describe('CTL053 - verifyDebitEntrantVsChargeMax', () => {
    it('should pass when total debit is below threshold (2 * maxDebitRef)', async () => {
      // maxDebitRef = max(pc95=500, dref=400) = 500, threshold = 1000
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an)
        VALUES (1, 'STEU001', 2024)
      `);
      await seedCpy(dataSource, 1, 1, 2024, undefined, 400);
      await seedStchan(dataSource, 1, 2024, 500);

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
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '900')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyDebitEntrantVsChargeMax(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL053);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when total debit exceeds threshold', async () => {
      // maxDebitRef = max(pc95=500, dref=400) = 500, threshold = 1000
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an)
        VALUES (2, 'STEU002', 2024)
      `);
      await seedCpy(dataSource, 2, 2, 2024, undefined, 400);
      await seedStchan(dataSource, 2, 2024, 500);

      const fctAssainissement = createTestFctAssainissement({
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
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '1100')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyDebitEntrantVsChargeMax(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL053);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_053);
      expect(result.errors[0].params).toEqual(['STEU002', '2024-01-15', '1100.00', '500.00', '1000.00']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should sum debits across A3, A2, A7 for the same date', async () => {
      // maxDebitRef = 500, threshold = 1000
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an)
        VALUES (3, 'STEU003', 2024)
      `);
      await seedCpy(dataSource, 3, 3, 2024, undefined, 300);
      await seedStchan(dataSource, 3, 2024, 500);

      const fctAssainissement = createTestFctAssainissement({
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
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '400')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A2',
                locGlobalePointMesure: 'A2',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '400')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_A7',
                locGlobalePointMesure: 'A7',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '300')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyDebitEntrantVsChargeMax(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL053);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_053);
      // Total = 400 + 400 + 300 = 1100 > 1000
      expect(result.errors[0].params).toEqual(['STEU003', '2024-01-15', '1100.00', '500.00', '1000.00']);
    });

    it('should skip locations other than A3, A2, A7', async () => {
      // maxDebitRef = 500, threshold = 1000
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an)
        VALUES (4, 'STEU004', 2024)
      `);
      await seedCpy(dataSource, 4, 4, 2024, undefined, 400);
      await seedStchan(dataSource, 4, 2024, 500);

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A4',
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '5000')],
                  },
                ],
              },
              {
                numeroPointMesure: 'PM_S7',
                locGlobalePointMesure: 'S7',
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

      const result = await controleMetierV2Service.verifyDebitEntrantVsChargeMax(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL053);
      expect(result.errors).toHaveLength(0); // A4 and S7 are not included
    });

    it('should skip when no maxDebitRef data exists', async () => {
      // No stchan or cpy data for this STEU
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an)
        VALUES (5, 'STEU005', 2024)
      `);

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU005',
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
            ],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyDebitEntrantVsChargeMax(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL053);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip prelevements with cdSupport != 3', async () => {
      // maxDebitRef = 500, threshold = 1000
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an)
        VALUES (6, 'STEU006', 2024)
      `);
      await seedCpy(dataSource, 6, 6, 2024, undefined, 400);
      await seedStchan(dataSource, 6, 2024, 500);

      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU006',
            pointMesure: [
              {
                numeroPointMesure: 'PM_A3',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '33', // Wrong support
                    analyse: [createTestAnalyse(CodeParametre.Volume.toString(), '5000')],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await controleMetierV2Service.verifyDebitEntrantVsChargeMax(fctAssainissement);

      expect(result.name).toBe(ControleName.CTL053);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('CTL054 - verifyChargeEntranteVsTranche', () => {
    it('should pass when charge max is within tranche bounds', async () => {
      // Tranche 2: seuil sup = 10 000 EH, charge max = 8000 EH -> OK
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, zgc_cdn, steu_encours_an)
        VALUES (1, 'STEU001', 100, 2024)
      `);
      await seedTltobl(dataSource, '2', 'De 2 000 à 10 000 EH');
      await seedAga(dataSource, 1, 100, 'AGA001', '2');
      await seedStchan(dataSource, 1, 2024, null, 8000);

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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when charge max exceeds tranche upper bound', async () => {
      // Tranche 2: seuil sup = 10 000 EH, charge max = 12000 EH -> AVERTISSEMENT
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, zgc_cdn, steu_encours_an)
        VALUES (2, 'STEU002', 200, 2024)
      `);
      await seedTltobl(dataSource, '2', 'De 2 000 à 10 000 EH');
      await seedAga(dataSource, 2, 200, 'AGA002', '2');
      await seedStchan(dataSource, 2, 2024, null, 12000);

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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result.errors[0].params).toEqual(['STEU002', '12000', 'De 2 000 à 10 000 EH', '10000']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when charge max exceeds tranche 1 upper bound', async () => {
      // Tranche 1: seuil sup = 2 000 EH, charge max = 3000 EH -> AVERTISSEMENT
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, zgc_cdn, steu_encours_an)
        VALUES (3, 'STEU003', 300, 2024)
      `);
      await seedTltobl(dataSource, '1', 'Moins de 2 000 EH');
      await seedAga(dataSource, 3, 300, 'AGA003', '1');
      await seedStchan(dataSource, 3, 2024, null, 3000);

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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result.errors[0].params).toEqual(['STEU003', '3000', 'Moins de 2 000 EH', '2000']);
    });

    it('should not report error for tranche 4 (no upper bound)', async () => {
      // Tranche 4: pas de seuil supérieur, charge max = 999999 EH -> OK
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, zgc_cdn, steu_encours_an)
        VALUES (4, 'STEU004', 400, 2024)
      `);
      await seedTltobl(dataSource, '4', 'Plus de 100 000 EH');
      await seedAga(dataSource, 4, 400, 'AGA004', '4');
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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for tranche 3 when charge exceeds 100 000 EH', async () => {
      // Tranche 3: seuil sup = 100 000 EH, charge max = 120000 EH -> AVERTISSEMENT
      await dataSource.query(`
        INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, zgc_cdn, steu_encours_an)
        VALUES (5, 'STEU005', 500, 2024)
      `);
      await seedTltobl(dataSource, '3', 'De 10 000 à 100 000 EH');
      await seedAga(dataSource, 5, 500, 'AGA005', '3');
      await seedStchan(dataSource, 5, 2024, null, 120000);

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

      expect(result.name).toBe(ControleName.CTL054);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result.errors[0].params).toEqual(['STEU005', '120000', 'De 10 000 à 100 000 EH', '100000']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });
});
