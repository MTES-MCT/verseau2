import { Test, TestingModule } from '@nestjs/testing';
import { ControleMetierV2Service } from './controleMetierV2.service';
import { ControleGateway } from '../controle.gateway';
import { ControleMapper } from '../isov1/controle.mapper';
import { FctAssainissement } from '@lib/parser';
import { CodeParametre } from '@referentiel/parametre/codeParametre';
import { ControleName, ErrorCode } from '@lib/dossier';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';

describe('ControleMetierV2Service', () => {
  let service: ControleMetierV2Service;
  let roseauGateway: jest.Mocked<RoseauGateway>;

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
            findConcentrationMoyenneAnnuelle: jest.fn(),
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '100', '150']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '10', '15']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '120', '100', '1.20']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '400', '100', '4.00']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '50', '100', '0.50']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '200', '100', '2.00']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '200']);
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
      expect(result.errors[0].params).toEqual(['STEU1', 'PM1', '2024-01-01', '3', '1800']);
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
                    analyse: [{ cdParametre: '1552', rsAnalyse: '40' }], // Volume A3 = 40 m³ (40*6=240 > 200)
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
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_051);
      expect(result.errors[0].params).toEqual(['STEU1', '2024-01-15', '200.00', '40', '≥', '18', '<']);
    });

    it('should return an error when volume A4 exceeds threshold', async () => {
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
                    analyse: [{ cdParametre: '1552', rsAnalyse: '50' }], // Volume A4 = 50 m³ (50*6=300 > 200)
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
      expect(result.errors[0].params).toEqual(['STEU1', '2024-01-15', '200.00', '20', '<', '50', '≥']);
    });

    it('should return an error when both volumes exceed threshold', async () => {
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
                    analyse: [{ cdParametre: '1552', rsAnalyse: '40' }],
                  },
                ],
              },
              {
                locGlobalePointMesure: 'A4',
                prelevement: [
                  {
                    datePrlvt: '2024-01-15',
                    analyse: [{ cdParametre: '1552', rsAnalyse: '50' }],
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
      expect(result.errors[0].params).toEqual(['STEU1', '2024-01-15', '200.00', '40', '≥', '50', '≥']);
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

      const cmaMap = new Map([
        [CodeParametre.DBO5.toString(), 150],
        [CodeParametre.DCO.toString(), 400],
      ]);
      roseauGateway.findConcentrationMoyenneAnnuelle.mockResolvedValue(cmaMap);

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
      expect(roseauGateway.findConcentrationMoyenneAnnuelle).toHaveBeenCalledWith('STEU1', 2023, [
        CodeParametre.DBO5.toString(),
        CodeParametre.DCO.toString(),
      ]);
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

      const cmaMap = new Map([
        [CodeParametre.DBO5.toString(), 150],
        [CodeParametre.DCO.toString(), 400],
      ]);
      roseauGateway.findConcentrationMoyenneAnnuelle.mockResolvedValue(cmaMap);

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj);

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

      const cmaMap = new Map(); // Vide - pas de CMA trouvée
      roseauGateway.findConcentrationMoyenneAnnuelle.mockResolvedValue(cmaMap);

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj);

      expect(result.errors).toHaveLength(0);
    });

    it('should return error when dateDebutReference is missing', async () => {
      const xmlObj: FctAssainissement = {
        scenario: {
          dateDebutReference: undefined,
        },
        ouvrages: [],
      } as unknown as FctAssainissement;

      const result = await service.verifyCmaComparisonForDcoDbo5(xmlObj);

      expect(result.name).toBe(ControleName.CTL052);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.E2_052);
    });
  });
});
