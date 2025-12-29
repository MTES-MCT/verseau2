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
    destinataire: Partial<Emetteur>;
    codeScenario: string;
    versionScenario: string;
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
    await stopPostgresContainer();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await dataSource.query(`DELETE FROM controle`);
    await clearDepots(dataSource);
    await clearReferentielData(dataSource);
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

    it('should report error when DCO value is missing', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [
              {
                numeroPointMesure: 'PM003',
                prelevement: [
                  {
                    datePrlvt: '2024-01-17',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '20')],
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
      expect(result.errors[0].params).toEqual([
        'STEU003',
        'PM003',
        '2024-01-17',
        '3',
        'Impossible de calculer le ratio (DCO)',
      ]);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DBO5 value is missing', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [
              {
                numeroPointMesure: 'PM004',
                prelevement: [
                  {
                    datePrlvt: '2024-01-18',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '50')],
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
      expect(result.errors[0].params).toEqual([
        'STEU004',
        'PM004',
        '2024-01-18',
        '3',
        'Impossible de calculer le ratio (DBO5)',
      ]);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DBO5 value is zero', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU005',
            pointMesure: [
              {
                numeroPointMesure: 'PM005',
                prelevement: [
                  {
                    datePrlvt: '2024-01-19',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '50'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '0'),
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
      expect(result.errors[0].params).toEqual([
        'STEU005',
        'PM005',
        '2024-01-19',
        '3',
        'Impossible de calculer le ratio (DBO5 <= 0)',
      ]);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DBO5 value is negative', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU006',
            pointMesure: [
              {
                numeroPointMesure: 'PM006',
                prelevement: [
                  {
                    datePrlvt: '2024-01-20',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.DCO.toString(), '50'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '-5'),
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
      expect(result.errors[0].params).toEqual([
        'STEU006',
        'PM006',
        '2024-01-20',
        '3',
        'Impossible de calculer le ratio (DBO5 <= 0)',
      ]);
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

    it('should handle missing both DCO and DBO5', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU011',
            pointMesure: [
              {
                numeroPointMesure: 'PM011',
                prelevement: [
                  {
                    datePrlvt: '2024-01-26',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse('1305', '15'), // MES (neither DCO nor DBO5)
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
      expect(result.errors[0].params).toEqual([
        'STEU011',
        'PM011',
        '2024-01-26',
        '3',
        'Impossible de calculer le ratio (DCO, DBO5)',
      ]);
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

    it('should report error when MES value is missing', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [
              {
                numeroPointMesure: 'PM003',
                prelevement: [
                  {
                    datePrlvt: '2024-01-17',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DBO5.toString(), '20')],
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
      expect(result.errors[0].params).toEqual([
        'STEU003',
        'PM003',
        '2024-01-17',
        '3',
        'Impossible de calculer le ratio (MES)',
      ]);
    });

    it('should report error when DBO5 value is missing', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [
              {
                numeroPointMesure: 'PM004',
                prelevement: [
                  {
                    datePrlvt: '2024-01-18',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.MES.toString(), '50')],
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
      expect(result.errors[0].params).toEqual([
        'STEU004',
        'PM004',
        '2024-01-18',
        '3',
        'Impossible de calculer le ratio (DBO5)',
      ]);
    });

    it('should report error when DBO5 value is zero', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU005',
            pointMesure: [
              {
                numeroPointMesure: 'PM005',
                prelevement: [
                  {
                    datePrlvt: '2024-01-19',
                    cdSupport: '3',
                    analyse: [
                      createTestAnalyse(CodeParametre.MES.toString(), '50'),
                      createTestAnalyse(CodeParametre.DBO5.toString(), '0'),
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
      expect(result.errors[0].params).toEqual([
        'STEU005',
        'PM005',
        '2024-01-19',
        '3',
        'Impossible de calculer le ratio (DBO5 <= 0)',
      ]);
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

    it('should report error when DCO value is missing', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [
              {
                numeroPointMesure: 'PM003',
                prelevement: [
                  {
                    datePrlvt: '2024-01-17',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.MES.toString(), '50')],
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
      expect(result.errors[0].params).toEqual(['STEU003', 'PM003', '2024-01-17', '3']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });

    it('should report error when DCO value is empty', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU004',
            pointMesure: [
              {
                numeroPointMesure: 'PM004',
                prelevement: [
                  {
                    datePrlvt: '2024-01-18',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.DCO.toString(), '')],
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
      expect(result.errors[0].params).toEqual(['STEU004', 'PM004', '2024-01-18', '3']);
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

    it('should report error when DBO5 value is missing', () => {
      const fctAssainissement = createTestFctAssainissement({
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU003',
            pointMesure: [
              {
                numeroPointMesure: 'PM003',
                prelevement: [
                  {
                    datePrlvt: '2024-01-17',
                    cdSupport: '3',
                    analyse: [createTestAnalyse(CodeParametre.MES.toString(), '50')],
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
      expect(result.errors[0].params).toEqual(['STEU003', 'PM003', '2024-01-17', '3']);
      expect(result.errors[0].evenementType).toBe(EvenementType.AVERTISSEMENT);
    });
  });
});
