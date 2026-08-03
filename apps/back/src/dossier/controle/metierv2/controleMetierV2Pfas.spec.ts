import * as fs from 'fs';
import * as path from 'path';
import { CodeUniteMesure, ControleName, ErrorCode, EvenementType } from '@lib/dossier';
import { FctAssainissement, LocGlobalePointMesure, parseScenarioAssainissementXml } from '@lib/parser';
import { MasaProvider } from '@masa/masa.provider';
import { ControleIndividuelWithoutSuccess } from '../isov1/controle.mapper';
import {
  ControleMetierV2Pfas,
  PFAS_REGLEMENTAIRES_CODES,
  PFAS_SURVEILLANCE_CODES,
  TFA_CODE,
} from './controleMetierV2Pfas';

describe('ControleMetierV2Pfas', () => {
  let service: ControleMetierV2Pfas;
  let masaProvider: jest.Mocked<Pick<MasaProvider, 'findCapaciteNominaleBatch'>>;

  beforeEach(() => {
    masaProvider = {
      findCapaciteNominaleBatch: jest
        .fn()
        .mockResolvedValue([{ ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 }]),
    };
    service = new ControleMetierV2Pfas(masaProvider as unknown as MasaProvider);
  });

  describe('with pfas_anonymized.xml', () => {
    let parsedPfasXml: FctAssainissement;

    beforeAll(async () => {
      const xmlPath = path.join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'xml', 'pfas_anonymized.xml');
      parsedPfasXml = await parseScenarioAssainissementXml(fs.readFileSync(xmlPath, 'utf-8'));
    });

    it('should evaluate all controls once and preserve their order', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'CD_OUVRAGE_1', capaciteNominaleEH: 10000 },
      ]);

      const results = await service.verifyPfasControls(parsedPfasXml);

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledTimes(1);
      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['CD_OUVRAGE_1'], 2026);
      expect(results.map((result) => result.name)).toEqual([
        ControleName.CTL201,
        ControleName.CTL202,
        ControleName.CTL203,
        ControleName.CTL204,
        ControleName.CTL205,
        ControleName.CTL207,
        ControleName.CTL208,
        ControleName.CTL209,
        ControleName.CTL210,
      ]);
      expect(selectControl(results, ControleName.CTL201)).toEqual({ name: ControleName.CTL201, errors: [] });
      expect(selectControl(results, ControleName.CTL202)?.errors).toEqual([
        {
          code: ErrorCode.E2_202,
          params: ['2026-03-09'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
      expect(selectControl(results, ControleName.CTL203)?.errors).toEqual([
        {
          code: ErrorCode.E2_203,
          params: ['2026-03-09'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
      expect(selectControl(results, ControleName.CTL204)).toEqual({ name: ControleName.CTL204, errors: [] });
      expect(selectControl(results, ControleName.CTL205)).toEqual({ name: ControleName.CTL205, errors: [] });
      expect(selectControl(results, ControleName.CTL207)?.errors).toEqual([
        {
          code: ErrorCode.E2_207,
          params: ['8986, 7991'],
          evenementType: EvenementType.INFORMATION,
        },
      ]);
      expect(selectControl(results, ControleName.CTL208)?.errors).toEqual([
        {
          code: ErrorCode.E2_208,
          params: ['22', '2026-03-09', TFA_CODE],
          evenementType: EvenementType.AVERTISSEMENT,
        },
        {
          code: ErrorCode.E2_208,
          params: ['22', '2026-03-09', TFA_CODE],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
      expect(selectControl(results, ControleName.CTL209)).toEqual({ name: ControleName.CTL209, errors: [] });
      expect(selectControl(results, ControleName.CTL210)?.errors).toEqual([
        {
          code: ErrorCode.E2_210,
          params: ['2026-03-09', 'Fluorure, Carbone organique'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });
  });

  describe('context preparation and applicability', () => {
    it('should deduplicate STEU codes and call MASA only once', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A4,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.ouvrages.push(data.ouvrages[0]);

      await service.verifyPfasControls(data);

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledTimes(1);
      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
    });

    it.each(['', 'invalid-date'])('should return no controls and avoid MASA for reference date %p', async (date) => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A4,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.scenario.dateDebutReference = date;

      await expect(service.verifyPfasControls(data)).resolves.toEqual([]);
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it('should return no controls and avoid MASA when no STEU code exists', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A4,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.ouvrages[0].cdOuvrageDepollution = '';

      await expect(service.verifyPfasControls(data)).resolves.toEqual([]);
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it.each([9999, undefined])('should return no controls for ineligible capacity %p', async (capacity) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue(
        capacity === undefined ? [] : [{ ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: capacity }],
      );
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A4,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });

      await expect(service.verifyPfasControls(data)).resolves.toEqual([]);
    });

    it.each([
      ['A2', '11'],
      [LocGlobalePointMesure.A4, '1'],
    ])('should ignore location %s with finality %s', async (location, finalite) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: location,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite }],
        }),
      );

      expect(results).toEqual([]);
    });
  });

  describe('presence controls', () => {
    it.each([
      [ControleName.CTL201, ErrorCode.E2_201, LocGlobalePointMesure.A4],
      [ControleName.CTL202, ErrorCode.E2_202, LocGlobalePointMesure.A3],
      [ControleName.CTL202, ErrorCode.E2_202, LocGlobalePointMesure.A4],
      [ControleName.CTL203, ErrorCode.E2_203, LocGlobalePointMesure.A3],
      [ControleName.CTL203, ErrorCode.E2_203, LocGlobalePointMesure.A4],
    ])('should report %s once for a failing %s sampling', async (name, errorCode, location) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: location,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(selectControl(results, name)?.errors).toContainEqual({
        code: errorCode,
        params: ['2024-06-01'],
        evenementType: EvenementType.AVERTISSEMENT,
      });
    });

    it('should accept companion parameters without requiring finality 11', async () => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11' },
            { cdParametre: '8986', finalite: '1' },
            { cdParametre: '7073', finalite: '1' },
            { cdParametre: '1841', finalite: '1' },
          ],
        }),
      );

      expect(selectControl(results, ControleName.CTL201)?.errors).toEqual([]);
      expect(selectControl(results, ControleName.CTL202)?.errors).toEqual([]);
      expect(selectControl(results, ControleName.CTL203)?.errors).toEqual([]);
    });

    it('should emit one error per prélèvement when dates are identical', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A3,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      appendSampling(data, [{ cdParametre: '5979', finalite: '11' }]);

      const results = await service.verifyPfasControls(data);

      expect(selectControl(results, ControleName.CTL202)?.errors).toEqual([
        { code: ErrorCode.E2_202, params: ['2024-06-01'], evenementType: EvenementType.AVERTISSEMENT },
        { code: ErrorCode.E2_202, params: ['2024-06-01'], evenementType: EvenementType.AVERTISSEMENT },
      ]);
    });
  });

  describe('CTL204', () => {
    it.each([
      ['8986', 'FLUORURE'],
      ['7073', 'AOF'],
    ])('should report the missing XOR companion for %s', async (presentParameter, missingParameter) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11' },
            { cdParametre: presentParameter, finalite: '11' },
          ],
        }),
      );

      expect(selectControl(results, ControleName.CTL204)?.errors).toEqual([
        {
          code: ErrorCode.E2_204,
          params: [missingParameter, '2024-06-01'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });

    it('should pass when AOF and fluorure are both absent', async () => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(selectControl(results, ControleName.CTL204)?.errors).toEqual([]);
    });
  });

  describe('CTL205', () => {
    it.each([
      [LocGlobalePointMesure.A3, '0.05', false],
      [LocGlobalePointMesure.A3, '0.0501', true],
      [LocGlobalePointMesure.A4, '0.02', false],
      [LocGlobalePointMesure.A4, '0.0201', true],
    ])('should apply the %s threshold to LQAna %s', async (location, lqAna, shouldFail) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: location,
          datePrlvt: '2024-06-01',
          analyses: [
            {
              cdParametre: '5980',
              cdUniteMesure: CodeUniteMesure.MICROGRAMME_PAR_LITRE,
              finalite: '11',
              lqAna,
            },
          ],
        }),
      );
      const control = selectControl(results, ControleName.CTL205);

      expect(control).toBeDefined();
      expect(control?.errors).toHaveLength(shouldFail ? 1 : 0);
    });

    it('should group unique failing regulatory codes per sampling', async () => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [
            {
              cdParametre: '5980',
              cdUniteMesure: CodeUniteMesure.MICROGRAMME_PAR_LITRE,
              finalite: '11',
              lqAna: '0.021',
            },
            {
              cdParametre: '5980',
              cdUniteMesure: CodeUniteMesure.MICROGRAMME_PAR_LITRE,
              finalite: '11',
              lqAna: '0.022',
            },
            {
              cdParametre: '5979',
              cdUniteMesure: CodeUniteMesure.MICROGRAMME_PAR_LITRE,
              finalite: '11',
              lqAna: '0.025',
            },
            {
              cdParametre: '8986',
              cdUniteMesure: CodeUniteMesure.MICROGRAMME_PAR_LITRE,
              finalite: '11',
              lqAna: '0.1',
            },
          ],
        }),
      );

      expect(selectControl(results, ControleName.CTL205)?.errors).toEqual([
        {
          code: ErrorCode.E2_205,
          params: ['5980, 5979', '2024-06-01'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });

    it.each([undefined, '', 'not-a-number'])('should not apply for invalid LQAna %p', async (lqAna) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11', lqAna }],
        }),
      );

      expect(selectControl(results, ControleName.CTL205)).toBeUndefined();
    });
  });

  describe('CTL207', () => {
    it('should read all eligible samplings and consolidate unique quantified codes', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A4,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '8986', finalite: '11', rsAnalyse: '2', lqAna: '1' }],
      });
      appendSampling(data, [
        { cdParametre: '6025', finalite: '11', rsAnalyse: '2', lqAna: '1' },
        { cdParametre: '8986', finalite: '11', rsAnalyse: '3', lqAna: '1' },
      ]);

      const results = await service.verifyPfasControls(data);

      expect(selectControl(results, ControleName.CTL207)?.errors).toEqual([
        {
          code: ErrorCode.E2_207,
          params: ['8986, 6025'],
          evenementType: EvenementType.INFORMATION,
        },
      ]);
    });

    it.each([
      ['', '1'],
      ['not-a-number', '1'],
      ['1', ''],
      ['1', 'not-a-number'],
    ])('should not apply for invalid result %p or limit %p', async (rsAnalyse, lqAna) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '8986', finalite: '11', rsAnalyse, lqAna }],
        }),
      );

      expect(selectControl(results, ControleName.CTL207)).toBeUndefined();
    });
  });

  describe('completeness controls', () => {
    it('should count unique finality-11 codes and preserve missing-code order', async () => {
      const analyses = PFAS_SURVEILLANCE_CODES.filter((code) => code !== TFA_CODE).map((cdParametre) => ({
        cdParametre,
        finalite: '11',
      }));
      analyses.push({ cdParametre: '5980', finalite: '11' });
      analyses.push({ cdParametre: TFA_CODE, finalite: '1' });

      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A3,
          datePrlvt: '2024-06-01',
          analyses,
        }),
      );

      expect(selectControl(results, ControleName.CTL208)?.errors).toEqual([
        {
          code: ErrorCode.E2_208,
          params: ['22', '2024-06-01', TFA_CODE],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
      expect(selectControl(results, ControleName.CTL209)?.errors).toEqual([]);
    });

    it('should preserve configured regulatory order in CTL209 missing codes', async () => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(selectControl(results, ControleName.CTL209)?.errors[0].params).toEqual([
        '1',
        '2024-06-01',
        PFAS_REGLEMENTAIRES_CODES.slice(1).join(', '),
      ]);
    });

    it('should emit one completeness warning per campaign with duplicate dates', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A4,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      appendSampling(data, [{ cdParametre: '5979', finalite: '11' }]);

      const results = await service.verifyPfasControls(data);

      expect(selectControl(results, ControleName.CTL208)?.errors).toHaveLength(2);
      expect(selectControl(results, ControleName.CTL209)?.errors).toHaveLength(2);
    });
  });

  describe('CTL210', () => {
    const habitualParameters = [
      { cdParametre: '1313', finalite: '1' },
      { cdParametre: '1305', finalite: '1' },
      { cdParametre: '1314', finalite: '1' },
      { cdParametre: '1552', finalite: '1' },
    ];
    const complementaryParameters = [
      { cdParametre: '7073', finalite: '1' },
      { cdParametre: '1841', finalite: '1' },
    ];

    it.each([
      [LocGlobalePointMesure.A3, [...habitualParameters, ...complementaryParameters]],
      [
        LocGlobalePointMesure.A4,
        [...habitualParameters, ...complementaryParameters, { cdParametre: '8986', finalite: '1' }],
      ],
    ])('should pass at %s when required parameters share the sampling', async (location, parameters) => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: location,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }, ...parameters],
        }),
      );

      expect(selectControl(results, ControleName.CTL210)?.errors).toEqual([]);
    });

    it('should check required parameters within each sampling, even on duplicate dates', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: LocGlobalePointMesure.A3,
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      appendSampling(data, [
        { cdParametre: '5979', finalite: '11' },
        ...habitualParameters,
        ...complementaryParameters,
      ]);

      const results = await service.verifyPfasControls(data);

      expect(selectControl(results, ControleName.CTL210)?.errors).toEqual([
        {
          code: ErrorCode.E2_210,
          params: ['2024-06-01', 'DBO5, MES, DCO, Débit moyen journalier, Fluorure, Carbone organique'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });

    it('should exclude TFA-only campaigns from CTL210', async () => {
      const results = await service.verifyPfasControls(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: LocGlobalePointMesure.A4,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: TFA_CODE, finalite: '11' }],
        }),
      );

      expect(selectControl(results, ControleName.CTL210)).toBeUndefined();
      expect(selectControl(results, ControleName.CTL208)).toBeDefined();
      expect(selectControl(results, ControleName.CTL209)).toBeDefined();
    });
  });
});

function selectControl(
  results: ControleIndividuelWithoutSuccess[],
  name: ControleName,
): ControleIndividuelWithoutSuccess | undefined {
  return results.find((result) => result.name === name);
}

type TestAnalysis = {
  cdParametre: string;
  cdUniteMesure?: string | CodeUniteMesure;
  finalite: string;
  lqAna?: string;
  rsAnalyse?: string;
};

function makeFctAssainissement({
  cdOuvrageDepollution,
  locGlobalePointMesure,
  datePrlvt,
  analyses,
}: {
  cdOuvrageDepollution: string;
  locGlobalePointMesure: string;
  datePrlvt: string;
  analyses: TestAnalysis[];
}): FctAssainissement {
  return {
    scenario: { dateDebutReference: '2024-01-01' },
    ouvrages: [
      {
        cdOuvrageDepollution,
        pointMesure: [
          {
            locGlobalePointMesure,
            prelevement: [{ datePrlvt, analyse: analyses }],
          },
        ],
      },
    ],
    systemesCollecte: [],
  } as unknown as FctAssainissement;
}

function appendSampling(data: FctAssainissement, analyses: TestAnalysis[]): void {
  const sampling = makeFctAssainissement({
    cdOuvrageDepollution: data.ouvrages[0].cdOuvrageDepollution,
    locGlobalePointMesure: data.ouvrages[0].pointMesure[0].locGlobalePointMesure ?? '',
    datePrlvt: data.ouvrages[0].pointMesure[0].prelevement[0].datePrlvt ?? '',
    analyses,
  });
  data.ouvrages[0].pointMesure[0].prelevement.push(sampling.ouvrages[0].pointMesure[0].prelevement[0]);
}
