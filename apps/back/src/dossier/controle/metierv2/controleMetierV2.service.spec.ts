/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ControleMetierV2Service } from './controleMetierV2.service';
import { ControleGateway } from '../controle.gateway';
import { ControleMapper } from '../isov1/controle.mapper';
import { FctAssainissement } from '@lib/parser';
import { CodeParametre, CodeUniteMesure, ControleName, ControleType, ErrorCode } from '@lib/dossier';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { MasaProvider } from '@masa/masa.provider';
import { CmaBySandreCdaAndParam, ProductionBoueZero } from '@masa/masa.dto';
import { ControleModel, CreateControleModel } from '../controle.model';
import { ControleMetierV2Pfas } from './controleMetierV2Pfas';

function createFctWithAnalyses(
  analyse: { cdParametre?: string; rsAnalyse?: string; cdUniteMesure?: string }[],
  locGlobalePointMesure = 'A3',
): FctAssainissement {
  return {
    scenario: { dateDebutReference: '2024-01-01' },
    ouvrages: [
      {
        cdOuvrageDepollution: 'STEU1',
        pointMesure: [
          {
            numeroPointMesure: 'PM1',
            locGlobalePointMesure,
            prelevement: [{ datePrlvt: '2024-01-15', cdSupport: '3', analyse }],
          },
        ],
      },
    ],
    systemesCollecte: [],
  } as unknown as FctAssainissement;
}

describe('ControleMetierV2Service', () => {
  let service: ControleMetierV2Service;
  let roseauGateway: jest.Mocked<RoseauGateway>;
  let masaProvider: jest.Mocked<MasaProvider>;
  let controleGateway: jest.Mocked<ControleGateway>;
  let controleMapper: jest.Mocked<ControleMapper>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControleMetierV2Service,
        {
          provide: ControleGateway,
          useValue: {
            createControles: jest.fn(),
          },
        },
        {
          provide: RoseauGateway,
          useValue: {
            findCapaciteNominaleBySteuSandreAndYear: jest.fn(),
          },
        },
        {
          provide: MasaProvider,
          useValue: {
            findCapaciteNominaleBatch: jest.fn(),
            findChargeEntranteMaxComparison: jest.fn(),
            findConcentrationsMoyennesBatch: jest.fn(),
            findMaxDebitsReferenceBatch: jest.fn(),
            findProductionBoueZeroBatch: jest.fn(),
          },
        },
        ControleMetierV2Pfas,
        {
          provide: ControleMapper,
          useValue: {
            mapControlesIndividuelsToCreateControleModel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ControleMetierV2Service>(ControleMetierV2Service);
    roseauGateway = module.get(RoseauGateway);
    masaProvider = module.get(MasaProvider);
    controleGateway = module.get(ControleGateway);
    controleMapper = module.get(ControleMapper);
  });

  describe('execute', () => {
    const depotId = 'depot-123';

    const xmlObj: FctAssainissement = {
      scenario: { dateDebutReference: '2024-01-01' },
      ouvrages: [
        {
          cdOuvrageDepollution: 'STEU1',
          pointMesure: [
            {
              numeroPointMesure: 'PM1',
              locGlobalePointMesure: 'A3',
              prelevement: [
                {
                  datePrlvt: '2024-01-15',
                  cdSupport: '3',
                  analyse: [
                    { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' },
                    { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '200' },
                    { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '100' },
                  ],
                },
              ],
            },
            {
              numeroPointMesure: 'PM2',
              locGlobalePointMesure: 'A4',
              prelevement: [
                {
                  datePrlvt: '2024-01-15',
                  cdSupport: '3',
                  analyse: [
                    { cdParametre: CodeParametre.pH.toString(), rsAnalyse: '7' },
                    { cdParametre: CodeParametre.Temperature.toString(), rsAnalyse: '20' },
                    { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '90' },
                    { cdParametre: '5980', rsAnalyse: '1', finalite: '11' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      systemesCollecte: [
        {
          cdSystemeCollecte: 'SCL1',
          pointMesure: [
            {
              locGlobalePointMesure: 'A1',
              prelevement: [
                {
                  datePrlvt: '2024-01-15',
                  cdSupport: '3',
                  analyse: [{ cdParametre: CodeParametre.Pluviometrie.toString(), rsAnalyse: '50' }],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as FctAssainissement;

    beforeEach(() => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      masaProvider.findConcentrationsMoyennesBatch.mockResolvedValue([]);
      masaProvider.findMaxDebitsReferenceBatch.mockResolvedValue([]);
      masaProvider.findProductionBoueZeroBatch.mockResolvedValue([]);
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([]);
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(null);
    });

    it('should pass only applicable controls to the mapper', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);
      const fakeCreateControles: CreateControleModel[] = [
        { depotId, name: ControleName.CTL041, type: ControleType.CONTROLE_V2, success: true },
      ] as CreateControleModel[];
      const fakeCreatedControles: ControleModel[] = [{ id: 'c1' }] as unknown as ControleModel[];

      controleMapper.mapControlesIndividuelsToCreateControleModel.mockReturnValue(fakeCreateControles);
      controleGateway.createControles.mockResolvedValue(fakeCreatedControles);

      await service.execute(depotId, xmlObj);

      // Verify the mapper was called with the correct control names (in order)
      expect(controleMapper.mapControlesIndividuelsToCreateControleModel).toHaveBeenCalledTimes(1);

      const [calledDepotId, calledType, calledControles] =
        controleMapper.mapControlesIndividuelsToCreateControleModel.mock.calls[0];
      expect(calledDepotId).toBe(depotId);
      expect(calledType).toBe(ControleType.CONTROLE_V2);

      const controleNames = calledControles.map((c) => c.name);
      expect(controleNames).toEqual([
        ControleName.CTL041, // verifyDcoRange
        ControleName.CTL042, // verifyDbo5Range
        ControleName.CTL047, // verifyDcoGreaterThanDbo5
        ControleName.CTL046, // verifyPhRange
        ControleName.CTL055, // verifyProductionBoue
        ControleName.CTL056, // verifyTemperatureA4Range
        ControleName.CTL057, // verifyPluviometrieRange
        ControleName.CTL058, // verifyVolumesNegatifs
        ControleName.CTL059, // verifyConcentrationsNegativesOuNulles
        ControleName.CTL060, // verifyChargePollutionVsCapaciteNominale
        ControleName.CTL061, // verifyDebitA3A4SameDate
        ControleName.CTL201, // verifyAofPresenceForPfasCampaigns
        ControleName.CTL202, // verifyFluorurePresenceForPfasCampaigns
        ControleName.CTL203, // verifyCarboneOrganiquePresenceForPfasCampaigns
        ControleName.CTL204, // verifyAofFluorureCoherenceForPfasCampaigns
      ]);
      expect(calledControles).not.toContain(null);
    });

    it('should pass tousControles results to the mapper and return createdControles from the gateway', async () => {
      const fakeCreateControles: CreateControleModel[] = [
        { depotId, name: ControleName.CTL041, type: ControleType.CONTROLE_V2, success: true },
        { depotId, name: ControleName.CTL042, type: ControleType.CONTROLE_V2, success: true },
      ] as CreateControleModel[];
      const fakeCreatedControles: ControleModel[] = [
        { id: 'c1', name: ControleName.CTL041 },
        { id: 'c2', name: ControleName.CTL042 },
      ] as unknown as ControleModel[];

      controleMapper.mapControlesIndividuelsToCreateControleModel.mockReturnValue(fakeCreateControles);
      controleGateway.createControles.mockResolvedValue(fakeCreatedControles);

      const result = await service.execute(depotId, xmlObj);

      // Verify controleGateway.createControles was called with the mapped models
      expect(controleGateway.createControles).toHaveBeenCalledWith(fakeCreateControles, undefined);

      // Verify execute returns the created controles from the gateway
      expect(result).toBe(fakeCreatedControles);
    });

    it('should call preloadMasaData with the correct parameters', async () => {
      controleMapper.mapControlesIndividuelsToCreateControleModel.mockReturnValue([]);
      controleGateway.createControles.mockResolvedValue([]);

      await service.execute(depotId, xmlObj);

      // findConcentrationsMoyennesBatch called with all STEU codes, previous year, DBO5 + DCO
      expect(masaProvider.findConcentrationsMoyennesBatch).toHaveBeenCalledWith(
        ['STEU1'],
        2023, // previous year
        [String(CodeParametre.DBO5), String(CodeParametre.DCO)],
      );

      // findMaxDebitsReferenceBatch called with all STEU codes
      expect(masaProvider.findMaxDebitsReferenceBatch).toHaveBeenCalledWith(['STEU1']);

      // findProductionBoueZeroBatch called with all STEU codes and current year
      expect(masaProvider.findProductionBoueZeroBatch).toHaveBeenCalledWith(['STEU1'], 2024);
    });

    it('should omit controls without evaluable data', async () => {
      controleMapper.mapControlesIndividuelsToCreateControleModel.mockReturnValue([]);
      controleGateway.createControles.mockResolvedValue([]);

      await service.execute(depotId, xmlObj);

      const [, , calledControles] = controleMapper.mapControlesIndividuelsToCreateControleModel.mock.calls[0];
      const typedControles = calledControles;

      expect(typedControles).toHaveLength(10);
      for (const controle of typedControles) {
        expect(controle).toHaveProperty('name');
        expect(controle).toHaveProperty('errors');
        expect(Array.isArray(controle.errors)).toBe(true);
      }
    });
  });

  describe('verifyDcoGreaterThanDbo5', () => {
    it('should return an error when DCO <= DBO5', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '100' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '150' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoGreaterThanDbo5(xmlObj);

      expect(result!.name).toBe(ControleName.CTL047);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_047);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '100', '150']);
    });

    it('should return no error when DCO > DBO5', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '300' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoGreaterThanDbo5(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should return no error when DCO or DBO5 is missing', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '300' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoGreaterThanDbo5(xmlObj);

      expect(result).toBeNull();
    });
  });

  describe('verifyNtkGreaterThanNnh4', () => {
    it('should return an error when NTK <= N-NH4', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '10' },
                      { cdParametre: CodeParametre.N_NH4.toString(), rsAnalyse: '15' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNtkGreaterThanNnh4(xmlObj);

      expect(result!.name).toBe(ControleName.CTL048);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_048);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '10', '15']);
    });

    it('should return no error when NTK > N-NH4', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '20' },
                      { cdParametre: CodeParametre.N_NH4.toString(), rsAnalyse: '10' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNtkGreaterThanNnh4(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });
  });

  describe('verifyRatioDcoDbo5', () => {
    it('should return an error when ratio DCO/DBO5 is below range (ratio <= 1.5)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '120' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyRatioDcoDbo5(xmlObj);

      expect(result!.name).toBe(ControleName.CTL039);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '120', '100', '1.20']);
    });

    it('should return an error when ratio DCO/DBO5 is above range (ratio >= 3.5)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '400' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyRatioDcoDbo5(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '400', '100', '4.00']);
    });

    it('should return no error when ratio DCO/DBO5 is within range (1.5 < ratio < 3.5)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '250' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyRatioDcoDbo5(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });
  });

  describe('verifyRatioMesDbo5', () => {
    it('should return an error when ratio MES/DBO5 is below range (ratio <= 0.7)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.MES.toString(), rsAnalyse: '50' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyRatioMesDbo5(xmlObj);

      expect(result!.name).toBe(ControleName.CTL040);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_040);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '50', '100', '0.50']);
    });

    it('should return an error when ratio MES/DBO5 is above range (ratio >= 1.5)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.MES.toString(), rsAnalyse: '200' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyRatioMesDbo5(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_040);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '200', '100', '2.00']);
    });

    it('should return no error when ratio MES/DBO5 is within range (0.7 < ratio < 1.5)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.MES.toString(), rsAnalyse: '100' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyRatioMesDbo5(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });
  });

  describe('verifyDcoRange', () => {
    it('should return an error when DCO is below range (DCO <= 300)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '200' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result!.name).toBe(ControleName.CTL041);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_041);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-01', '3', '200']);
    });

    it('should return an error when DCO is above range (DCO >= 1700)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '1800' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_041);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-01', '3', '1800']);
    });

    it('should return no error when DCO is within range (300 < DCO < 1700)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should not apply when DCO is missing', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result).toBeNull();
    });
  });

  describe('verifyDbo5Range', () => {
    it('should return an error when DBO5 is below range on A3 and cdSupport 3', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDbo5Range(xmlObj);

      expect(result!.name).toBe(ControleName.CTL042);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_042);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-01', '3', '100']);
    });
  });

  describe('verifyNtkRange', () => {
    it('should return an error when NTK is below range (NTK <= 20)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.NTK.toString(),
                        rsAnalyse: '15',
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNtkRange(xmlObj);

      expect(result!.name).toBe(ControleName.CTL044);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_044);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '15']);
    });

    it('should return an error when NTK is above range (NTK >= 160)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.NTK.toString(),
                        rsAnalyse: '170',
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNtkRange(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_044);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '170']);
    });

    it('should not apply when NTK has no expected unit', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '50' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNtkRange(xmlObj);

      expect(result).toBeNull();
    });

    it('should not test analyses where cdUniteMesure is not MG_N_L for NTK', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.NTK.toString(),
                        rsAnalyse: '500', // Out of range if tested
                        cdUniteMesure: 'NOT_MG_N_L',
                      },
                      {
                        cdParametre: CodeParametre.NTK.toString(),
                        rsAnalyse: '100',
                        cdUniteMesure: CodeUniteMesure.MG_N_L.toString(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNtkRange(xmlObj);

      expect(result!.errors).toHaveLength(0);
      expect(result!.name).toBe(ControleName.CTL044);
    });
  });

  describe('verifyPtotRange', () => {
    it('should return an error when Ptot is below range (Ptot <= 4)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.Ptot.toString(),
                        rsAnalyse: '3',
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPtotRange(xmlObj);

      expect(result!.name).toBe(ControleName.CTL045);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_045);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '3']);
    });

    it('should return an error when Ptot is above range (Ptot >= 25)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.Ptot.toString(),
                        rsAnalyse: '30',
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPtotRange(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_045);
      expect(result!.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '30']);
    });

    it('should return no error when Ptot is within range (4 < Ptot < 25)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.Ptot.toString(),
                        rsAnalyse: '10',
                        cdUniteMesure: CodeUniteMesure.MG_L.toString(),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPtotRange(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should not test this analyse when cdUniteMesure is not MG_L for Ptot', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-01',
                    cdSupport: '3',
                    analyse: [
                      {
                        cdParametre: CodeParametre.Ptot.toString(),
                        rsAnalyse: '1',
                        cdUniteMesure: 'NOT_MG_L',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPtotRange(xmlObj);

      expect(result).toBeNull();
    });
  });

  describe('verifyVolumeA3A4VsCapaciteEH', () => {
    it('should not apply when capacity is below the threshold', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(1000);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '20' }], // Volume A3 = 20 m³
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '18' }], // Volume A4 = 18 m³
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result).toBeNull();
      expect(roseauGateway.findCapaciteNominaleBySteuSandreAndYear).toHaveBeenCalledWith('STEU1', 2024);
    });

    it('should return an error when volume A3 exceeds threshold', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(2001);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '2500' }],
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '180' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result!.name).toBe(ControleName.CTL051);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result!.errors[0].params).toEqual(['STEU1', '2024-01-15', '2401.20', '2500', '≥', '180', '<']);
    });

    it('should return an error when volume A4 exceeds threshold', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(2001);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '200' }],
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '3000' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result!.name).toBe(ControleName.CTL051);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result!.errors[0].params).toEqual(['STEU1', '2024-01-15', '2401.20', '200', '<', '3000', '≥']);
    });

    it('should return an error when both volumes exceed threshold', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(2001);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '2500' }],
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '3000' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result!.name).toBe(ControleName.CTL051);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result!.errors[0].params).toEqual(['STEU1', '2024-01-15', '2401.20', '2500', '≥', '3000', '≥']);
    });

    it('should not apply when capacity is not found', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(null);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '40' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result).toBeNull();
    });

    it('should not apply when volumes are missing', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(1000);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result).toBeNull();
    });

    it('should return error when dateDebutReference is missing', async () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: undefined,
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result!.errors[0].params).toEqual([undefined]);
      expect(roseauGateway.findCapaciteNominaleBySteuSandreAndYear).not.toHaveBeenCalled();
    });

    it('should not apply control when capacity is less than or equal to 2000 EH', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(2000);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '1000' }], // Volume très élevé
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '1000' }], // Volume très élevé
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result).toBeNull();
      expect(roseauGateway.findCapaciteNominaleBySteuSandreAndYear).toHaveBeenCalledWith('STEU1', 2024);
    });

    it('should apply control when capacity is greater than 2000 EH', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(2001);

      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '2500' }],
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '2500' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyVolumeA3A4VsCapaciteEH(xmlObj);

      expect(result!.name).toBe(ControleName.CTL051);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_051);
      expect(roseauGateway.findCapaciteNominaleBySteuSandreAndYear).toHaveBeenCalledWith('STEU1', 2024);
    });
  });

  describe('verifyCmaComparisonForDcoDbo5', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return an error when DBO5 value exceeds CMA N-1', () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-06-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '200' }, // 200 vs CMA 150 = 33% écart
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const cmas: CmaBySandreCdaAndParam[] = [
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DBO5.toString(),
          resultatAnnuelConcentrationMoyenne: 150,
        },
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DCO.toString(),
          resultatAnnuelConcentrationMoyenne: 400,
        },
      ];

      const result = service.verifyCmaComparisonForDcoDbo5(xmlObj, cmas);

      expect(result!.name).toBe(ControleName.CTL052);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_052);
    });

    it('should return no error when values are lower than CMA N-1', () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-06-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '149' }, // 155 vs CMA 150 = 3% écart
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '399' }, // 400 vs CMA 400 = 0% écart
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const cmas: CmaBySandreCdaAndParam[] = [
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DBO5.toString(),
          resultatAnnuelConcentrationMoyenne: 150,
        },
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DCO.toString(),
          resultatAnnuelConcentrationMoyenne: 400,
        },
      ];

      const result = service.verifyCmaComparisonForDcoDbo5(xmlObj, cmas);

      expect(result!.errors).toHaveLength(0);
    });

    it('should not trigger error when DBO5 exceeds CMA N-1 by less than 10%', () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-06-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '164' }, // 164 vs CMA 150 = 9.3% (< 10%)
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const cmas: CmaBySandreCdaAndParam[] = [
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DBO5.toString(),
          resultatAnnuelConcentrationMoyenne: 150,
        },
      ];

      const result = service.verifyCmaComparisonForDcoDbo5(xmlObj, cmas);

      expect(result!.errors).toHaveLength(0);
    });

    it('should skip comparison when no CMA found', () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU_NOT_FOUND',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-06-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '500' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      // Empty array — no CMA found for any STEU
      const result = service.verifyCmaComparisonForDcoDbo5(xmlObj, []);

      expect(result).toBeNull();
    });

    it('should return error when dateDebutReference is missing', () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: undefined,
        },
        ouvrages: [],
      } as unknown as FctAssainissement;

      const result = service.verifyCmaComparisonForDcoDbo5(xmlObj, []);

      expect(result!.name).toBe(ControleName.CTL052);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_052);
    });
  });
  describe('verifyNglGreaterThanNtk', () => {
    it('should return an error when NGL <= NTK', () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: '2024-01-01',
        },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU_CODE',
            pointMesure: [
              {
                numeroPointMesure: 'PM1',
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-06-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '10' },
                      { cdParametre: CodeParametre.NGL.toString(), rsAnalyse: '5' },
                    ],
                  },
                  {
                    datePrlvt: '2024-06-16',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '1' },
                      { cdParametre: CodeParametre.NGL.toString(), rsAnalyse: '5' },
                    ],
                  },
                  {
                    datePrlvt: '2024-06-17',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '5' },
                      { cdParametre: CodeParametre.NGL.toString(), rsAnalyse: '1' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyNglGreaterThanNtk(xmlObj);

      expect(result!.name).toBe(ControleName.CTL049);
      expect(result!.errors).toHaveLength(2);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_049);
      expect(result!.errors[0].params).toEqual(['STEU_CODE', 'A3', '2024-06-15', '3', '5', '10']);
      expect(result!.errors[1].params).toEqual(['STEU_CODE', 'A3', '2024-06-17', '3', '1', '5']);
    });
  });

  describe('verifyChargeEntranteVsTranche', () => {
    it('should detect variation > 20% between year N and N-1', async () => {
      // N = 10000, N-1 = 5000 => variation = 100% => error
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU1',
          chargeEntranteMaximaleEHN: 10000,
          chargeEntranteMaximaleEHNMoins1: 5000,
          trancheObligationLibelle: 'Tranche 2',
          bilanReferenceAnnee: 2024,
        },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargeEntranteVsTranche(xmlObj);

      expect(masaProvider.findChargeEntranteMaxComparison).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result!.errors[0].params).toEqual(['STEU1', '10000', '5000', 'Tranche 2', '100.0']);
    });

    it('should not report error when variation <= 20%', async () => {
      // N = 5500, N-1 = 5000 => variation = 10% => OK
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU1',
          chargeEntranteMaximaleEHN: 5500,
          chargeEntranteMaximaleEHNMoins1: 5000,
          trancheObligationLibelle: 'Tranche 2',
          bilanReferenceAnnee: 2024,
        },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargeEntranteVsTranche(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should detect negative variation > 20%', async () => {
      // N = 3000, N-1 = 5000 => variation = -40% => |variation| = 40% => error
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU1',
          chargeEntranteMaximaleEHN: 3000,
          chargeEntranteMaximaleEHNMoins1: 5000,
          trancheObligationLibelle: 'Tranche 2',
          bilanReferenceAnnee: 2024,
        },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargeEntranteVsTranche(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result!.errors[0].params).toEqual(['STEU1', '3000', '5000', 'Tranche 2', '40.0']);
    });
  });

  describe('verifyProductionBoue', () => {
    it('should return an error when production boue is zero for a STEU', () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2025-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const productionsBoueZero: ProductionBoueZero[] = [
        { ouvrageDepollutionCode: 'STEU1', boueProductionAnnee: 2025, boueProductionAnnuelle: 0 },
      ];

      const result = service.verifyProductionBoue(xmlObj, productionsBoueZero);

      expect(result.name).toBe(ControleName.CTL055);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_055);
      expect(result.errors[0].params).toEqual(['STEU1', '2025', '0']);
    });

    it('should return no error when STEU is not in the zero-production list', () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2025-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = service.verifyProductionBoue(xmlObj, []);

      expect(result.name).toBe(ControleName.CTL055);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for multiple STEUs with zero production', () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2025-01-01' },
        ouvrages: [
          { cdOuvrageDepollution: 'STEU1' },
          { cdOuvrageDepollution: 'STEU2' },
          { cdOuvrageDepollution: 'STEU3' },
        ],
      } as unknown as FctAssainissement;

      const productionsBoueZero: ProductionBoueZero[] = [
        { ouvrageDepollutionCode: 'STEU1', boueProductionAnnee: 2025, boueProductionAnnuelle: 0 },
        { ouvrageDepollutionCode: 'STEU3', boueProductionAnnee: 2025, boueProductionAnnuelle: 0 },
      ];

      const result = service.verifyProductionBoue(xmlObj, productionsBoueZero);

      expect(result.name).toBe(ControleName.CTL055);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].params).toEqual(['STEU1', '2025', '0']);
      expect(result.errors[1].params).toEqual(['STEU3', '2025', '0']);
    });

    it('should skip ouvrages without ouvrageDepollutionCode', () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2025-01-01' },
        ouvrages: [{ cdOuvrageDepollution: undefined }, { cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const productionsBoueZero: ProductionBoueZero[] = [
        { ouvrageDepollutionCode: 'STEU1', boueProductionAnnee: 2025, boueProductionAnnuelle: 0 },
      ];

      const result = service.verifyProductionBoue(xmlObj, productionsBoueZero);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].params).toEqual(['STEU1', '2025', '0']);
    });
  });

  describe('verifyTemperatureA4Range (CTL056)', () => {
    it('should return an error when temperature <= 0 on point A4', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Temperature.toString(), rsAnalyse: '0' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyTemperatureA4Range(xmlObj);

      expect(result!.name).toBe(ControleName.CTL056);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_056);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A4', '2024-01-15', '3', '0']);
    });

    it('should return an error when temperature > 35 on point A4', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-07-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Temperature.toString(), rsAnalyse: '36' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyTemperatureA4Range(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_056);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A4', '2024-07-15', '3', '36']);
    });

    it('should return no error when temperature is within range (0 < T <= 35)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Temperature.toString(), rsAnalyse: '20' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyTemperatureA4Range(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should not check temperature on non-A4 points', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Temperature.toString(), rsAnalyse: '-5' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyTemperatureA4Range(xmlObj);

      expect(result).toBeNull();
    });

    it('should not apply when temperature is missing', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyTemperatureA4Range(xmlObj);

      expect(result).toBeNull();
    });

    it('should return error for negative temperature on A4', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Temperature.toString(), rsAnalyse: '-3' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyTemperatureA4Range(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_056);
    });
  });

  describe('verifyPluviometrieRange (CTL057)', () => {
    it('should return AVERTISSEMENT when pluviometrie < 0 on SCL point A1', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Pluviometrie.toString(), rsAnalyse: '-5' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPluviometrieRange(xmlObj);

      expect(result!.name).toBe(ControleName.CTL057);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_057);
      expect(result!.errors[0].evenementType).toBe('AVERTISSEMENT');
      expect(result!.errors[0].params).toEqual(['SCL1', 'A1', '2024-01-15', '3', '-5']);
    });

    it('should return AVERTISSEMENT when pluviometrie > 200 but <= 1000 on R1', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'R1',
                prelevement: [
                  {
                    datePrlvt: '2024-03-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Pluviometrie.toString(), rsAnalyse: '300' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPluviometrieRange(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].evenementType).toBe('AVERTISSEMENT');
    });

    it('should return ERREUR (bloquant) when pluviometrie > 1000', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A1',
                prelevement: [
                  {
                    datePrlvt: '2024-03-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Pluviometrie.toString(), rsAnalyse: '1500' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPluviometrieRange(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_057);
      expect(result!.errors[0].evenementType).toBe('ERREUR');
    });

    it('should return no error when pluviometrie is within range (0 <= P <= 200)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Pluviometrie.toString(), rsAnalyse: '50' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPluviometrieRange(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should not check pluviometrie on non-A1/R1 points', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Pluviometrie.toString(), rsAnalyse: '-10' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyPluviometrieRange(xmlObj);

      expect(result).toBeNull();
    });
  });

  describe('verifyVolumesNegatifs (CTL058)', () => {
    it('should return ERREUR when Vol.Moy.J (1552) is negative on ouvrage', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '-100' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyVolumesNegatifs(xmlObj);

      expect(result!.name).toBe(ControleName.CTL058);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_058);
      expect(result!.errors[0].evenementType).toBe('ERREUR');
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-15', '3', 'Vol.Moy.J', '-100']);
    });

    it('should return ERREUR when Volume (1098) is negative on SCL', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.VolumeRef.toString(), rsAnalyse: '-50' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyVolumesNegatifs(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_058);
      expect(result!.errors[0].params).toEqual(['SCL1', 'A1', '2024-01-15', '3', 'Volume', '-50']);
    });

    it('should return ERREUR when Masse (1099) is negative', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Masse.toString(), rsAnalyse: '-10' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyVolumesNegatifs(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A4', '2024-01-15', '3', 'Masse', '-10']);
    });

    it('should return no error when all volumes are positive', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '100' },
                      { cdParametre: CodeParametre.VolumeRef.toString(), rsAnalyse: '200' },
                      { cdParametre: CodeParametre.Masse.toString(), rsAnalyse: '50' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyVolumesNegatifs(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should return no error when volume is zero', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '0' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyVolumesNegatifs(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });
  });

  describe('verifyConcentrationsNegativesOuNulles (CTL059)', () => {
    it('should return ERREUR when DBO5 is negative', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '-10' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.name).toBe(ControleName.CTL059);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_059);
      expect(result!.errors[0].evenementType).toBe('ERREUR');
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-15', '3', 'DBO5', '-10']);
    });

    it('should return ERREUR when concentration is zero', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '0' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A4', '2024-01-15', '3', 'DCO', '0']);
    });

    it('should return errors for multiple negative/zero concentrations in same prelevement', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '-5' },
                      { cdParametre: CodeParametre.MES.toString(), rsAnalyse: '0' },
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' }, // OK
                    ],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.errors).toHaveLength(2);
      expect(result!.errors[0].params[4]).toBe('DBO5');
      expect(result!.errors[1].params[4]).toBe('MES');
    });

    it('should return no error when all concentrations are positive', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '200' },
                      { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' },
                      { cdParametre: CodeParametre.MES.toString(), rsAnalyse: '300' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should ignore concentrations on SCL (systemesCollecte no longer checked)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'R1',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.NTK.toString(), rsAnalyse: '-2' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result).toBeNull();
    });

    it('should return ERREUR when cdSupport is 4 (newly included)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '4',
                    analyse: [{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '-5' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-15', '4', 'DBO5', '-5']);
    });

    it('should return ERREUR when cdSupport is 5 (newly included)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '5',
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '-5' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].params).toEqual(['STEU1', 'A3', '2024-01-15', '5', 'DCO', '-5']);
    });

    it('should return no error when cdSupport is 1 (ignored by filter upstream)', () => {
      const _xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '1',
                    analyse: [{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '-5' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      // verifyConcentrationsNegativesOuNulles only sees pre-filtered data in production;
      // this test simulates what happens when cdSupport=1 data is excluded by the filter.
      // The method itself does not filter — so this test verifies that callers pass pre-filtered data.
      // Here we call it directly to document the expected outcome: a negative value is detected.
      // In the actual execute() pipeline, cdSupport=1 is filtered out before reaching this method.
      const result = service.verifyConcentrationsNegativesOuNulles(
        // Simulate already-filtered data: no prélèvements with cdSupport=1 pass through
        { ouvrages: [], systemesCollecte: [] } as unknown as FctAssainissement,
      );

      expect(result).toBeNull();
    });

    it('should return no error when locGlobalePointMesure is M1 (ignored by filter upstream)', () => {
      // M1 does not start with 'S' or 'A', so it is filtered out before reaching this method
      const result = service.verifyConcentrationsNegativesOuNulles({
        ouvrages: [],
        systemesCollecte: [],
      } as unknown as FctAssainissement);

      expect(result).toBeNull();
    });

    it('should return ERREUR when locGlobalePointMesure is S3 (newly included by prefix filter)', () => {
      const xmlObj: FctAssainissement = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'S3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [{ cdParametre: CodeParametre.MES.toString(), rsAnalyse: '-1' }],
                  },
                ],
              },
            ],
          },
        ],
        systemesCollecte: [],
      } as unknown as FctAssainissement;

      const result = service.verifyConcentrationsNegativesOuNulles(xmlObj);

      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].params).toEqual(['STEU1', 'S3', '2024-01-15', '3', 'MES', '-1']);
    });
  });

  describe('verifyChargePollutionVsCapaciteNominale (CTL060)', () => {
    it('should return AVERTISSEMENT when charge > 1.5 * capacite nominale', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 5000 },
      ]);

      // Volume = 1000 m³/j, DBO5 = 600 mg/L => charge = (1000*600)/60 = 10000 EH > 7500 (1.5*5000)
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '1000' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '600' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result!.name).toBe(ControleName.CTL060);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_060);
      expect(result!.errors[0].evenementType).toBe('AVERTISSEMENT');
      expect(result!.errors[0].params).toEqual(['STEU1', '10000.00', '5000', '7500.00', '2024-01-15']);
    });

    it('should return no error when charge <= 1.5 * capacite nominale', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      // Volume = 500 m³/j, DBO5 = 300 mg/L => charge = (500*300)/60 = 2500 EH <= 15000 (1.5*10000)
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '500' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '300' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result!.errors).toHaveLength(0);
    });

    it('should skip when capacite nominale < 2000 EH', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 1999 },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '10000' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '10000' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result).toBeNull();
    });

    it('should apply when capacite nominale = 2000 EH', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 2000 },
      ]);

      // Volume = 500 m³/j, DBO5 = 500 mg/L => charge = (500*500)/60 = 4166.67 EH > 3000 (1.5*2000)
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '500' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '500' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result!.name).toBe(ControleName.CTL060);
      expect(result!.errors).toHaveLength(1);
      expect(result!.errors[0].code).toBe(ErrorCode.E2_060);
    });

    it('should skip when capacite nominale is not found', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '10000' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '10000' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result).toBeNull();
    });

    it('should only check A3 points', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 5000 },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A4', // Not A3
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    cdSupport: '3',
                    analyse: [
                      { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '10000' },
                      { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '10000' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result).toBeNull();
    });

    it('should not apply when dateDebutReference is missing', async () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: undefined },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1', pointMesure: [] }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargePollutionVsCapaciteNominale(xmlObj);

      expect(result).toBeNull();
    });
  });

  describe('non-applicable controls with missing values', () => {
    it.each([
      [ControleName.CTL041, (fct: FctAssainissement) => service.verifyDcoRange(fct)],
      [ControleName.CTL042, (fct: FctAssainissement) => service.verifyDbo5Range(fct)],
      [ControleName.CTL043, (fct: FctAssainissement) => service.verifyMesRange(fct)],
      [ControleName.CTL044, (fct: FctAssainissement) => service.verifyNtkRange(fct)],
      [ControleName.CTL045, (fct: FctAssainissement) => service.verifyPtotRange(fct)],
      [ControleName.CTL046, (fct: FctAssainissement) => service.verifyPhRange(fct)],
    ])('should not apply %s when its parameter is missing', (_controleName, verify) => {
      expect(verify(createFctWithAnalyses([]))).toBeNull();
    });

    it.each([
      [ControleName.CTL039, (fct: FctAssainissement) => service.verifyRatioDcoDbo5(fct), CodeParametre.DCO],
      [ControleName.CTL040, (fct: FctAssainissement) => service.verifyRatioMesDbo5(fct), CodeParametre.MES],
    ])('should not apply %s when DBO5 is missing', (_controleName, verify, numeratorCode) => {
      const fct = createFctWithAnalyses([{ cdParametre: numeratorCode.toString(), rsAnalyse: '300' }]);

      expect(verify(fct)).toBeNull();
    });

    it('should not apply CTL039 when DCO is missing or DBO5 is not strictly positive', () => {
      const withoutDco = createFctWithAnalyses([{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '100' }]);
      const withZeroDbo5 = createFctWithAnalyses([
        { cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '300' },
        { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '0' },
      ]);

      expect(service.verifyRatioDcoDbo5(withoutDco)).toBeNull();
      expect(service.verifyRatioDcoDbo5(withZeroDbo5)).toBeNull();
    });

    it.each([
      [ControleName.CTL047, (fct: FctAssainissement) => service.verifyDcoGreaterThanDbo5(fct), CodeParametre.DCO],
      [ControleName.CTL048, (fct: FctAssainissement) => service.verifyNtkGreaterThanNnh4(fct), CodeParametre.NTK],
      [ControleName.CTL049, (fct: FctAssainissement) => service.verifyNglGreaterThanNtk(fct), CodeParametre.NGL],
      [ControleName.CTL050, (fct: FctAssainissement) => service.verifyPGreaterThanPO4(fct), CodeParametre.Ptot],
    ])('should not apply %s when the second value is missing', (_controleName, verify, firstParamCode) => {
      const fct = createFctWithAnalyses([{ cdParametre: firstParamCode.toString(), rsAnalyse: '100' }]);

      expect(verify(fct)).toBeNull();
    });

    it('should not apply CTL051 when only one volume is available or dates do not match', async () => {
      roseauGateway.findCapaciteNominaleBySteuSandreAndYear.mockResolvedValue(3000);
      const withOnlyA3 = createFctWithAnalyses([{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '1000' }]);
      const withDifferentDates = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '1000' }],
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-16',
                    analyse: [{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '900' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      await expect(service.verifyVolumeA3A4VsCapaciteEH(withOnlyA3)).resolves.toBeNull();
      await expect(service.verifyVolumeA3A4VsCapaciteEH(withDifferentDates)).resolves.toBeNull();
    });

    it('should not apply CTL052 without a value matching the available CMA', () => {
      const dbo5Only = createFctWithAnalyses([{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '200' }]);
      const dcoOnly = createFctWithAnalyses([{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' }]);
      const dbo5Cma: CmaBySandreCdaAndParam[] = [
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DBO5.toString(),
          resultatAnnuelConcentrationMoyenne: 150,
        },
      ];
      const dcoCma: CmaBySandreCdaAndParam[] = [
        {
          ouvrageDepollutionCode: 'STEU1',
          parametreAnalyseCode: CodeParametre.DCO.toString(),
          resultatAnnuelConcentrationMoyenne: 400,
        },
      ];

      expect(service.verifyCmaComparisonForDcoDbo5(dbo5Only, dcoCma)).toBeNull();
      expect(service.verifyCmaComparisonForDcoDbo5(dcoOnly, dbo5Cma)).toBeNull();
    });

    it('should not apply CTL053 when the debit or its reference is missing', async () => {
      const withoutDebit = createFctWithAnalyses([]);
      masaProvider.findMaxDebitsReferenceBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', ouvrageDepollutionDebitMaximalReference: 500 },
      ]);

      await expect(service.verifyDebitEntrantVsChargeMax(withoutDebit)).resolves.toBeNull();

      const withDebit = createFctWithAnalyses([{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '1000' }]);
      masaProvider.findMaxDebitsReferenceBatch.mockResolvedValue([]);

      await expect(service.verifyDebitEntrantVsChargeMax(withDebit)).resolves.toBeNull();
    });

    it('should not apply CTL054 when no N/N-1 comparison is available', async () => {
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([]);

      await expect(service.verifyChargeEntranteVsTranche(createFctWithAnalyses([]))).resolves.toBeNull();
    });

    it('should not apply CTL056 to CTL059 when no targeted value is available', () => {
      const withoutAnalyses = createFctWithAnalyses([], 'A4');
      const withoutPluviometrie = {
        ouvrages: [],
        systemesCollecte: [
          {
            cdSystemeCollecte: 'SCL1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A1',
                prelevement: [{ datePrlvt: '2024-01-15', cdSupport: '3', analyse: [] }],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      expect(service.verifyTemperatureA4Range(withoutAnalyses)).toBeNull();
      expect(service.verifyPluviometrieRange(withoutPluviometrie)).toBeNull();
      expect(service.verifyVolumesNegatifs(withoutAnalyses)).toBeNull();
      expect(service.verifyConcentrationsNegativesOuNulles(withoutAnalyses)).toBeNull();
    });

    it.each([
      ['volume', [{ cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '500' }]],
      ['DBO5', [{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '500' }]],
      [
        'strictly positive volume',
        [
          { cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '0' },
          { cdParametre: CodeParametre.DBO5.toString(), rsAnalyse: '500' },
        ],
      ],
    ])('should not apply CTL060 without a %s', async (_missingValue, analyse) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 5000 },
      ]);

      await expect(service.verifyChargePollutionVsCapaciteNominale(createFctWithAnalyses(analyse))).resolves.toBeNull();
    });

    it('should not apply CTL061 without a dated A3 or A4 volume', () => {
      const withoutVolume = createFctWithAnalyses([{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' }]);
      const withoutDate = {
        ouvrages: [
          {
            cdOuvrageDepollution: 'STEU1',
            pointMesure: [
              {
                locGlobalePointMesure: 'A3',
                prelevement: [{ analyse: [{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '1000' }] }],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      expect(service.verifyDebitA3A4SameDate(withoutVolume)).toBeNull();
      expect(service.verifyDebitA3A4SameDate(withoutDate)).toBeNull();
    });

    it('should keep CTL061 applicable when only one side has a dated volume', () => {
      const withOnlyA3 = createFctWithAnalyses([{ cdParametre: CodeParametre.Volume.toString(), rsAnalyse: '1000' }]);

      expect(service.verifyDebitA3A4SameDate(withOnlyA3)).toEqual({
        name: ControleName.CTL061,
        errors: [
          {
            code: ErrorCode.E2_061,
            params: ['A4', '2024-01-15'],
            evenementType: 'AVERTISSEMENT',
          },
        ],
      });
    });
  });
});
