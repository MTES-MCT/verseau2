/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ControleMetierV2Service } from './controleMetierV2.service';
import { ControleGateway } from '../controle.gateway';
import { ControleMapper } from '../isov1/controle.mapper';
import { FctAssainissement } from '@lib/parser';
import { CodeParametre, CodeUniteMesure } from '@referentiel/parametre/codeParametre';
import { ControleName, ErrorCode } from '@lib/dossier';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { MasaProvider } from '@masa/masa.provider';
import { CmaBySandreCdaAndParam, ProductionBoueZero } from '@masa/masa.dto';

describe('ControleMetierV2Service', () => {
  let service: ControleMetierV2Service;
  let roseauGateway: jest.Mocked<RoseauGateway>;
  let masaProvider: jest.Mocked<MasaProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControleMetierV2Service,
        {
          provide: ControleGateway,
          useValue: {},
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
            findChargeEntranteMaxComparison: jest.fn(),
          },
        },
        {
          provide: ControleMapper,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ControleMetierV2Service>(ControleMetierV2Service);
    roseauGateway = module.get(RoseauGateway);
    masaProvider = module.get(MasaProvider);
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

      expect(result.name).toBe(ControleName.CTL047);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_047);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '100', '150']);
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL048);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_048);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '10', '15']);
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL039);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '120', '100', '1.20']);
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

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_039);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '400', '100', '4.00']);
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL040);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_040);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '50', '100', '0.50']);
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

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_040);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '200', '100', '2.00']);
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL041);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_041);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '200']);
    });

    it('should return an error when DCO is above range (DCO >= 1700)', () => {
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
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '1800' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_041);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '1800']);
    });

    it('should return no error when DCO is within range (300 < DCO < 1700)', () => {
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
                    analyse: [{ cdParametre: CodeParametre.DCO.toString(), rsAnalyse: '500' }],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result.errors).toHaveLength(0);
    });

    it('should return no error when DCO is missing', () => {
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
                    analyse: [],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FctAssainissement;

      const result = service.verifyDcoRange(xmlObj);

      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL044);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_044);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '15']);
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

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_044);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '170']);
    });

    it('should return no error when NTK is within range (20 < NTK < 160)', () => {
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.errors).toHaveLength(0);
      expect(result.name).toBe(ControleName.CTL044);
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

      expect(result.name).toBe(ControleName.CTL045);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_045);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '3']);
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

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_045);
      expect(result.errors[0].params).toEqual(['STEU1', '', '2024-01-01', '3', '30']);
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

      expect(result.errors).toHaveLength(0);
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

      const result = service.verifyNtkRange(xmlObj);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('verifyVolumeA3A4VsCapaciteEH', () => {
    it('should return no error when volumes are within acceptable range', async () => {
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

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual(['STEU1', '2024-01-15', '2401.20', '2500', '≥', '180', '<']);
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

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual(['STEU1', '2024-01-15', '2401.20', '200', '<', '3000', '≥']);
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

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual(['STEU1', '2024-01-15', '2401.20', '2500', '≥', '3000', '≥']);
    });

    it('should return no error when capacity is not found', async () => {
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

      expect(result.errors).toHaveLength(0);
    });

    it('should return no error when volumes are missing', async () => {
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

      expect(result.errors).toHaveLength(0);
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

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual([undefined]);
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

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(0);
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

      expect(result.name).toBe(ControleName.CTL051);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(roseauGateway.findCapaciteNominaleBySteuSandreAndYear).toHaveBeenCalledWith('STEU1', 2024);
    });
  });

  describe('verifyCmaComparisonForDcoDbo5', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return an error when DBO5 value exceeds CMA N-1', async () => {
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
        { sandreCda: 'STEU1', paramCode: CodeParametre.DBO5.toString(), value: 150 },
        { sandreCda: 'STEU1', paramCode: CodeParametre.DCO.toString(), value: 400 },
      ];

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj, cmas);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
    });

    it('should return no error when values are lower than CMA N-1', async () => {
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
        { sandreCda: 'STEU1', paramCode: CodeParametre.DBO5.toString(), value: 150 },
        { sandreCda: 'STEU1', paramCode: CodeParametre.DCO.toString(), value: 400 },
      ];

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj, cmas);

      expect(result.errors).toHaveLength(0);
    });

    it('should skip comparison when no CMA found', async () => {
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
      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj, []);

      expect(result.errors).toHaveLength(0);
    });

    it('should return error when dateDebutReference is missing', async () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: undefined,
        },
        ouvrages: [],
      } as unknown as FctAssainissement;

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj, []);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
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

      expect(result.name).toBe(ControleName.CTL049);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe(ErrorCode.E2_049);
      expect(result.errors[0].params).toEqual(['STEU_CODE', 'A3', '2024-06-15', '3', '5', '10']);
      expect(result.errors[1].params).toEqual(['STEU_CODE', 'A3', '2024-06-17', '3', '1', '5']);
    });
  });

  describe.skip('verifyChargeEntranteVsTranche', () => {
    it('should detect variation > 20% between year N and N-1', async () => {
      // N = 10000, N-1 = 5000 => variation = 100% => error
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([
        { sandreCda: 'STEU1', chargeMaxN: 10000, chargeMaxNMoins1: 5000, trancheLabel: 'Tranche 2', annee: 2024 },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargeEntranteVsTranche(xmlObj);

      expect(masaProvider.findChargeEntranteMaxComparison).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result.errors[0].params).toEqual(['STEU1', '10000', '5000', 'Tranche 2', '100.0']);
    });

    it('should not report error when variation <= 20%', async () => {
      // N = 5500, N-1 = 5000 => variation = 10% => OK
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([
        { sandreCda: 'STEU1', chargeMaxN: 5500, chargeMaxNMoins1: 5000, trancheLabel: 'Tranche 2', annee: 2024 },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargeEntranteVsTranche(xmlObj);

      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative variation > 20%', async () => {
      // N = 3000, N-1 = 5000 => variation = -40% => |variation| = 40% => error
      masaProvider.findChargeEntranteMaxComparison.mockResolvedValue([
        { sandreCda: 'STEU1', chargeMaxN: 3000, chargeMaxNMoins1: 5000, trancheLabel: 'Tranche 2', annee: 2024 },
      ]);

      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2024-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const result = await service.verifyChargeEntranteVsTranche(xmlObj);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_054);
      expect(result.errors[0].params).toEqual(['STEU1', '3000', '5000', 'Tranche 2', '40.0']);
    });
  });

  describe('verifyProductionBoue', () => {
    it('should return an error when production boue is zero for a STEU', () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2025-01-01' },
        ouvrages: [{ cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const productionsBoueZero: ProductionBoueZero[] = [{ sandreCda: 'STEU1', annee: 2025, productionBoue: 0 }];

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
        { sandreCda: 'STEU1', annee: 2025, productionBoue: 0 },
        { sandreCda: 'STEU3', annee: 2025, productionBoue: 0 },
      ];

      const result = service.verifyProductionBoue(xmlObj, productionsBoueZero);

      expect(result.name).toBe(ControleName.CTL055);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].params).toEqual(['STEU1', '2025', '0']);
      expect(result.errors[1].params).toEqual(['STEU3', '2025', '0']);
    });

    it('should skip ouvrages without cdOuvrageDepollution', () => {
      const xmlObj: FctAssainissement = {
        scenario: { dateDebutReference: '2025-01-01' },
        ouvrages: [{ cdOuvrageDepollution: undefined }, { cdOuvrageDepollution: 'STEU1' }],
      } as unknown as FctAssainissement;

      const productionsBoueZero: ProductionBoueZero[] = [{ sandreCda: 'STEU1', annee: 2025, productionBoue: 0 }];

      const result = service.verifyProductionBoue(xmlObj, productionsBoueZero);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].params).toEqual(['STEU1', '2025', '0']);
    });
  });
});
