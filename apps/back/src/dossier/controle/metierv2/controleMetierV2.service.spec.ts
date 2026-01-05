import { Test, TestingModule } from '@nestjs/testing';
import { ControleMetierV2Service } from './controleMetierV2.service';
import { ControleGateway } from '../controle.gateway';
import { ControleMapper } from '../isov1/controle.mapper';
import { FctAssainissement } from '@lib/parser';
import { CodeParametre } from '@referentiel/parametre/codeParametre';
import { ControleName, ErrorCode } from '@lib/dossier';

describe('ControleMetierV2Service', () => {
  let service: ControleMetierV2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControleMetierV2Service,
        {
          provide: ControleGateway,
          useValue: {},
        },
        {
          provide: ControleMapper,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ControleMetierV2Service>(ControleMetierV2Service);
  });

  describe('verifyDcoGtDbo5', () => {
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
      } as FctAssainissement;

      const result = service.verifyDcoGtDbo5(xmlObj);

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
      } as FctAssainissement;

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
      } as FctAssainissement;

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
      } as FctAssainissement;

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
      } as FctAssainissement;

      const result = service.verifyNtkGreaterThanNnh4(xmlObj);

      expect(result.errors).toHaveLength(0);
    });
  });
});
