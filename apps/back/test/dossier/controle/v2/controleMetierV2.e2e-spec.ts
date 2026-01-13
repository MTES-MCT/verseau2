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
import { CodeParametre } from '@referentiel/parametre/codeParametre';

import { ControleName, ErrorCode, EvenementType } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';
import { startPostgresContainer, stopPostgresContainer, getPostgresConnectionUri } from '../../../testcontainer.config';
import { createReferentielDataset, clearReferentielData } from '../../../createReferentielDataset';
import { clearDepots } from '../../../depot.helper';
import type { Analyse, Emetteur, FctAssainissement, OuvrageDepollution, SystemeCollecte } from '@lib/parser';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';
import { initTestContainerImports } from '../../../init/initTestContainer';

type PartialFctAssainissement = {
  scenario?: {
    emetteur: Partial<Emetteur>;
    destinataire?: Partial<Emetteur>;
    codeScenario: string;
    versionScenario: string;
    dateDebutReference?: string;
  };
  ouvrages?: Partial<OuvrageDepollution>[];
  systemesCollecte?: Partial<SystemeCollecte>;
};

// Helper to create minimal Analyse for testing
function createTestAnalyse(cdParametre: string, rsAnalyse: string): Analyse {
  return {
    cdParametre,
    rsAnalyse,
    inSituAnalyse: '',
    statutRsAnalyse: '',
    qualRsAnalyse: '',
    cdMethode: '',
    cdUniteMesure: '',
    finalite: '',
    accreAna: '',
    cdRemAnalyse: '',
  };
}

// Helper to create minimal FctAssainissement for testing
function createTestFctAssainissement(overrides: PartialFctAssainissement = {}): FctAssainissement {
  const fct = {
    scenario: {
      emetteur: {},
      codeScenario: SandreScenarioCode.FCT_ASSAIN,
      versionScenario: SandreScenarioVersion.V4,
      // dateDebutReference and dateFinReference commented out - unused by controleV1 and controleMetierV2 services
    },
    ouvrages: [],
    systemesCollecte: [],
    ...overrides,
  } as FctAssainissement;

  // Default values so existing tests continue to exercise controls even with filtering enabled.
  // Individual tests can override these to assert filtering behavior.
  for (const ouvrage of fct.ouvrages ?? []) {
    for (const pointMesure of ouvrage.pointMesure ?? []) {
      pointMesure.locGlobalePointMesure ??= 'A3';
      for (const prelevement of pointMesure.prelevement ?? []) {
        prelevement.cdSupport ??= '3';
      }
    }
  }
  for (const systemeCollecte of fct.systemesCollecte ?? []) {
    for (const pointMesure of systemeCollecte.pointMesure ?? []) {
      pointMesure.locGlobalePointMesure ??= 'A3';
      for (const prelevement of pointMesure.prelevement ?? []) {
        prelevement.cdSupport ??= '3';
      }
    }
  }

  return fct;
}

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
      expect(result.errors[0].params).toEqual(['STEU001', 'PM001', '2024-01-15', '3', '30', '20', '1.50']);
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
      expect(result.errors[0].params).toEqual(['STEU002', 'PM002', '2024-01-16', '3', '70', '20', '3.50']);
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

      // Check errors are for different point de mesure
      const ouvragesPMCombos = result.errors.map((e) => `${e.params[0]}-${e.params[1]}`);
      expect(ouvragesPMCombos).toContain('STEU008-PM008A');
      expect(ouvragesPMCombos).toContain('STEU008-PM008B');
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
      expect(result.errors[0].params).toEqual(['STEU001', 'PM001', '2024-01-15', '3', '7', '10', '0.70']);
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
      expect(result.errors[0].params).toEqual(['STEU002', 'PM002', '2024-01-16', '3', '15', '10', '1.50']);
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
      expect(result.errors[0].params).toEqual(['STEU001', 'PM001', '2024-01-15', '3', '300']);
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
      expect(result.errors[0].params).toEqual(['STEU002', 'PM002', '2024-01-16', '3', '1700']);
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
      expect(result.errors[0].params).toEqual(['STEU001', 'PM001', '2024-01-15', '3', '150']);
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
      expect(result.errors[0].params).toEqual(['STEU002', 'PM002', '2024-01-16', '3', '800']);
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
});
