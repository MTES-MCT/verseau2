import * as fs from 'fs';
import * as path from 'path';
import { FctAssainissement, parseScenarioAssainissementXml } from '@lib/parser';
import { ErrorCode, EvenementType, ControleName } from '@lib/dossier';
import { MasaProvider } from '@masa/masa.provider';
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
      findCapaciteNominaleBatch: jest.fn(),
    };
    service = new ControleMetierV2Pfas(masaProvider as unknown as MasaProvider);
  });

  describe('with pfas_anonymized.xml', () => {
    let parsedPfasXml: FctAssainissement;

    beforeAll(async () => {
      const xmlPath = path.join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'xml', 'pfas_anonymized.xml');
      parsedPfasXml = await parseScenarioAssainissementXml(fs.readFileSync(xmlPath, 'utf-8'));
    });

    beforeEach(() => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'CD_OUVRAGE_1', capaciteNominaleEH: 10000 },
      ]);
    });

    it('should evaluate presence and coherence controls from the real A3 and A4 campaigns', async () => {
      const [aofResult, fluorureResult, carboneOrganiqueResult, coherenceResult] = await Promise.all([
        service.verifyAofPresenceForPfasCampaigns(parsedPfasXml),
        service.verifyFluorurePresenceForPfasCampaigns(parsedPfasXml),
        service.verifyCarboneOrganiquePresenceForPfasCampaigns(parsedPfasXml),
        service.verifyAofFluorureCoherenceForPfasCampaigns(parsedPfasXml),
      ]);

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledTimes(4);
      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['CD_OUVRAGE_1'], 2026);
      expect(aofResult).toEqual({ name: ControleName.CTL201, errors: [] });
      expect(fluorureResult).toEqual({
        name: ControleName.CTL202,
        errors: [
          {
            code: ErrorCode.E2_202,
            params: ['2026-03-09'],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
      expect(carboneOrganiqueResult).toEqual({
        name: ControleName.CTL203,
        errors: [
          {
            code: ErrorCode.E2_203,
            params: ['2026-03-09'],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
      expect(coherenceResult).toEqual({ name: ControleName.CTL204, errors: [] });
    });

    it('should accept the real quantification limits and identify quantified PFAS', async () => {
      const [quantificationLimitsResult, quantifiedPfasResult] = await Promise.all([
        service.verifyQuantificationLimitsForPfasCampaigns(parsedPfasXml),
        service.identifyQuantifiedPfas(parsedPfasXml),
      ]);

      expect(quantificationLimitsResult).toEqual({ name: ControleName.CTL205, errors: [] });
      expect(quantifiedPfasResult).toEqual({
        name: ControleName.CTL207,
        errors: [
          {
            code: ErrorCode.E2_207,
            params: ['8986, 7991'],
            evenementType: EvenementType.INFORMATION,
          },
        ],
      });
    });

    it('should report the missing TFA while validating all 22 other regulatory PFAS', async () => {
      const [withTfaResult, excludingTfaResult] = await Promise.all([
        service.verifyRegulatoryPfasCompleteness(parsedPfasXml),
        service.verifyRegulatoryPfasExcludingTfaCompleteness(parsedPfasXml),
      ]);
      const missingTfaError = {
        code: ErrorCode.E2_208,
        params: ['22', '2026-03-09', TFA_CODE],
        evenementType: EvenementType.AVERTISSEMENT,
      };

      expect(withTfaResult).toEqual({
        name: ControleName.CTL208,
        errors: [missingTfaError, missingTfaError],
      });
      expect(excludingTfaResult).toEqual({ name: ControleName.CTL209, errors: [] });
    });
  });

  it('should report AVERTISSEMENT when a PFAS campaign at A4 has no AOF analysis for an eligible STEU', async () => {
    masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
    ]);

    const result = await service.verifyAofPresenceForPfasCampaigns(
      makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      }),
    );

    expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
    expect(result).toEqual({
      name: ControleName.CTL201,
      errors: [
        {
          code: ErrorCode.E2_201,
          params: ['2024-06-01'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ],
    });
  });

  it('should pass when AOF is present in the same prelevement', async () => {
    masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
    ]);

    const result = await service.verifyAofPresenceForPfasCampaigns(
      makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [
          { cdParametre: '5980', finalite: '11' },
          { cdParametre: '8986', finalite: '11' },
        ],
      }),
    );

    expect(result).toEqual({ name: ControleName.CTL201, errors: [] });
  });

  it('should ignore PFAS campaigns for STEU under 10000 EH', async () => {
    masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
    ]);

    const result = await service.verifyAofPresenceForPfasCampaigns(
      makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      }),
    );

    expect(result).toBeNull();
  });

  it('should ignore analyses outside A4 or outside PFAS finality', async () => {
    masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
      { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
    ]);

    const outsideA4Result = await service.verifyAofPresenceForPfasCampaigns(
      makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      }),
    );

    const outsideFinalityResult = await service.verifyAofPresenceForPfasCampaigns(
      makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '1' }],
      }),
    );

    expect(outsideA4Result).toBeNull();
    expect(outsideFinalityResult).toBeNull();
  });

  it('should not call MasaProvider when the reference year is missing', async () => {
    const fctAssainissement = makeFctAssainissement({
      cdOuvrageDepollution: 'STEU1',
      locGlobalePointMesure: 'A4',
      datePrlvt: '2024-06-01',
      analyses: [{ cdParametre: '5980', finalite: '11' }],
    });
    fctAssainissement.scenario.dateDebutReference = '';

    const result = await service.verifyAofPresenceForPfasCampaigns(fctAssainissement);

    expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should detect PFAS campaigns only for finality 11 and regulatory PFAS codes', () => {
    expect(service.isPfasCampaign([{ cdParametre: '5980', finalite: '11' }])).toBe(true);
    expect(service.isPfasCampaign([{ cdParametre: TFA_CODE, finalite: '11' }])).toBe(true);
    expect(service.isPfasCampaign([{ cdParametre: '8986', finalite: '11' }])).toBe(false);
    expect(service.isPfasCampaign([{ cdParametre: '5980', finalite: '1' }])).toBe(false);
  });

  describe('verifyFluorurePresenceForPfasCampaigns', () => {
    it.each(['A3', 'A4'])('should report AVERTISSEMENT at %s when fluorure is absent', async (point) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.verifyFluorurePresenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result).toEqual({
        name: ControleName.CTL202,
        errors: [
          {
            code: ErrorCode.E2_202,
            params: ['2024-06-01'],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
    });

    it('should pass when fluorure is present in the same prelevement', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyFluorurePresenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A3',
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11' },
            { cdParametre: '7073', finalite: '11' },
          ],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL202, errors: [] });
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.verifyFluorurePresenceForPfasCampaigns(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.verifyFluorurePresenceForPfasCampaigns(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11'],
      ['A3', '1'],
    ])('should ignore point %s with finality %s', async (point, finalite) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyFluorurePresenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite }],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.verifyFluorurePresenceForPfasCampaigns(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it('should report one error per prelevement sharing the same date', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      const secondData = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5979', finalite: '11' }],
      });
      data.ouvrages[0].pointMesure[0].prelevement.push(secondData.ouvrages[0].pointMesure[0].prelevement[0]);

      const result = await service.verifyFluorurePresenceForPfasCampaigns(data);

      expect(result?.errors).toEqual([
        { code: ErrorCode.E2_202, params: ['2024-06-01'], evenementType: EvenementType.AVERTISSEMENT },
        { code: ErrorCode.E2_202, params: ['2024-06-01'], evenementType: EvenementType.AVERTISSEMENT },
      ]);
    });
  });

  describe('verifyCarboneOrganiquePresenceForPfasCampaigns', () => {
    it.each(['A3', 'A4'])('should report AVERTISSEMENT at %s when organic carbon is absent', async (point) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.verifyCarboneOrganiquePresenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result).toEqual({
        name: ControleName.CTL203,
        errors: [
          {
            code: ErrorCode.E2_203,
            params: ['2024-06-01'],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
    });

    it('should pass when organic carbon is present in the same prelevement', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyCarboneOrganiquePresenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A3',
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11' },
            { cdParametre: '1841', finalite: '11' },
          ],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL203, errors: [] });
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.verifyCarboneOrganiquePresenceForPfasCampaigns(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.verifyCarboneOrganiquePresenceForPfasCampaigns(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11'],
      ['A3', '1'],
    ])('should ignore point %s with finality %s', async (point, finalite) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyCarboneOrganiquePresenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite }],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.verifyCarboneOrganiquePresenceForPfasCampaigns(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });
  });

  describe('verifyAofFluorureCoherenceForPfasCampaigns', () => {
    it.each([
      {
        point: 'A3',
        presentParameter: '8986',
        missingParameter: 'FLUORURE',
      },
      {
        point: 'A4',
        presentParameter: '7073',
        missingParameter: 'AOF',
      },
    ])(
      'should report AVERTISSEMENT at $point when $missingParameter is absent',
      async ({ point, presentParameter, missingParameter }) => {
        masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
          { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
        ]);

        const result = await service.verifyAofFluorureCoherenceForPfasCampaigns(
          makeFctAssainissement({
            cdOuvrageDepollution: 'STEU1',
            locGlobalePointMesure: point,
            datePrlvt: '2024-06-01',
            analyses: [
              { cdParametre: '5980', finalite: '11' },
              { cdParametre: presentParameter, finalite: '11' },
            ],
          }),
        );

        expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
        expect(result).toEqual({
          name: ControleName.CTL204,
          errors: [
            {
              code: ErrorCode.E2_204,
              params: [missingParameter, '2024-06-01'],
              evenementType: EvenementType.AVERTISSEMENT,
            },
          ],
        });
      },
    );

    it('should pass when AOF and fluorure are both present in the same prelevement', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyAofFluorureCoherenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A3',
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11' },
            { cdParametre: '8986', finalite: '11' },
            { cdParametre: '7073', finalite: '11' },
          ],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL204, errors: [] });
    });

    it('should pass when AOF and fluorure are both absent from a PFAS campaign', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyAofFluorureCoherenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL204, errors: [] });
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [
          { cdParametre: '5980', finalite: '11' },
          { cdParametre: '8986', finalite: '11' },
        ],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.verifyAofFluorureCoherenceForPfasCampaigns(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.verifyAofFluorureCoherenceForPfasCampaigns(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11'],
      ['A3', '1'],
    ])('should ignore point %s with PFAS finality %s', async (point, finalite) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyAofFluorureCoherenceForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite },
            { cdParametre: '8986', finalite: '11' },
          ],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [
          { cdParametre: '5980', finalite: '11' },
          { cdParametre: '8986', finalite: '11' },
        ],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.verifyAofFluorureCoherenceForPfasCampaigns(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });
  });

  describe('verifyQuantificationLimitsForPfasCampaigns', () => {
    it.each([
      ['A3', '50.1'],
      ['A4', '20.1'],
    ])('should report AVERTISSEMENT when the quantification limit exceeds the %s threshold', async (point, lqAna) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11', lqAna }],
        }),
      );

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result).toEqual({
        name: ControleName.CTL205,
        errors: [
          {
            code: ErrorCode.E2_205,
            params: ['5980', '2024-06-01'],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
    });

    it.each([
      ['A3', '50'],
      ['A4', '20'],
    ])('should pass at the exact %s threshold', async (point, lqAna) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11', lqAna }],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL205, errors: [] });
    });

    it('should group all failing PFAS codes from the same prelevement', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11', lqAna: '21' },
            { cdParametre: '5979', finalite: '11', lqAna: '25' },
            { cdParametre: '5978', finalite: '11', lqAna: '20' },
          ],
        }),
      );

      expect(result?.errors).toEqual([
        {
          code: ErrorCode.E2_205,
          params: ['5980, 5979', '2024-06-01'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });

    it('should ignore non-regulatory parameters from the same PFAS prelevement', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11', lqAna: '20' },
            { cdParametre: '8986', finalite: '11', lqAna: '100' },
            { cdParametre: '7073', finalite: '11', lqAna: '100' },
            { cdParametre: '1841', finalite: '11', lqAna: '100' },
          ],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL205, errors: [] });
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11', lqAna: '51' }],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.verifyQuantificationLimitsForPfasCampaigns(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.verifyQuantificationLimitsForPfasCampaigns(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11', '5980'],
      ['A3', '1', '5980'],
      ['A3', '11', '8986'],
    ])('should ignore point %s, finality %s and parameter %s', async (point, finalite, cdParametre) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre, finalite, lqAna: '100' }],
        }),
      );

      expect(result).toBeNull();
    });

    it.each([undefined, '', 'not-a-number'])('should not evaluate a missing or invalid LQAna value', async (lqAna) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11', lqAna }],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11', lqAna: '21' }],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.verifyQuantificationLimitsForPfasCampaigns(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it('should report one error per prelevement sharing the same date', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11', lqAna: '21' }],
      });
      const secondData = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5979', finalite: '11', lqAna: '22' }],
      });
      data.ouvrages[0].pointMesure[0].prelevement.push(secondData.ouvrages[0].pointMesure[0].prelevement[0]);

      const result = await service.verifyQuantificationLimitsForPfasCampaigns(data);

      expect(result?.errors).toEqual([
        { code: ErrorCode.E2_205, params: ['5980', '2024-06-01'], evenementType: EvenementType.AVERTISSEMENT },
        { code: ErrorCode.E2_205, params: ['5979', '2024-06-01'], evenementType: EvenementType.AVERTISSEMENT },
      ]);
    });
  });

  describe('identifyQuantifiedPfas', () => {
    it.each(['A3', 'A4'])('should report quantified PFAS as INFORMATION at %s', async (point) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.identifyQuantifiedPfas(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '8986', finalite: '11', rsAnalyse: '2', lqAna: '1' },
            { cdParametre: '6025', finalite: '11', rsAnalyse: '0.6', lqAna: '0.5' },
          ],
        }),
      );

      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result).toEqual({
        name: ControleName.CTL207,
        errors: [
          {
            code: ErrorCode.E2_207,
            params: ['8986, 6025'],
            evenementType: EvenementType.INFORMATION,
          },
        ],
      });
    });

    it('should pass when the result equals the quantification limit', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.identifyQuantifiedPfas(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A3',
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '6025', finalite: '11', rsAnalyse: '0.5', lqAna: '0.5' }],
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL207, errors: [] });
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '8986', finalite: '11', rsAnalyse: '2', lqAna: '1' }],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.identifyQuantifiedPfas(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.identifyQuantifiedPfas(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11', '8986'],
      ['A3', '1', '8986'],
      ['A3', '11', '7073'],
    ])('should ignore point %s, finality %s and parameter %s', async (point, finalite, cdParametre) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.identifyQuantifiedPfas(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre, finalite, rsAnalyse: '2', lqAna: '1' }],
        }),
      );

      expect(result).toBeNull();
    });

    it.each([
      ['', '1'],
      ['not-a-number', '1'],
      ['1', ''],
      ['1', 'not-a-number'],
    ])('should not evaluate invalid RsAnalyse %s or LQAna %s', async (rsAnalyse, lqAna) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.identifyQuantifiedPfas(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '6025', finalite: '11', rsAnalyse, lqAna }],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '6025', finalite: '11', rsAnalyse: '2', lqAna: '1' }],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.identifyQuantifiedPfas(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it('should consolidate quantified codes across prelevements sharing the same date', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '8986', finalite: '11', rsAnalyse: '2', lqAna: '1' }],
      });
      const secondData = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '6025', finalite: '11', rsAnalyse: '2', lqAna: '1' }],
      });
      data.ouvrages[0].pointMesure[0].prelevement.push(secondData.ouvrages[0].pointMesure[0].prelevement[0]);

      const result = await service.identifyQuantifiedPfas(data);

      expect(result?.errors).toEqual([
        { code: ErrorCode.E2_207, params: ['8986, 6025'], evenementType: EvenementType.INFORMATION },
      ]);
    });
  });

  describe('verifyRegulatoryPfasCompleteness', () => {
    it.each(['A3', 'A4'])('should report missing regulatory PFAS as AVERTISSEMENT at %s', async (point) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.verifyRegulatoryPfasCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite: '11' }],
        }),
      );

      expect(PFAS_SURVEILLANCE_CODES).toHaveLength(23);
      expect(PFAS_SURVEILLANCE_CODES).toContain(TFA_CODE);
      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result).toEqual({
        name: ControleName.CTL208,
        errors: [
          {
            code: ErrorCode.E2_208,
            params: ['1', '2024-06-01', PFAS_SURVEILLANCE_CODES.filter((code) => code !== '5980').join(', ')],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
    });

    it('should pass when all 23 regulatory PFAS are present in the same prelevement', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyRegulatoryPfasCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: PFAS_SURVEILLANCE_CODES.map((cdParametre) => ({ cdParametre, finalite: '11' })),
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL208, errors: [] });
    });

    it('should count each regulatory PFAS code once and only with finality 11', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const analyses = PFAS_SURVEILLANCE_CODES.filter((code) => code !== TFA_CODE).map((cdParametre) => ({
        cdParametre,
        finalite: '11',
      }));
      analyses.push({ cdParametre: '5980', finalite: '11' });
      analyses.push({ cdParametre: TFA_CODE, finalite: '1' });

      const result = await service.verifyRegulatoryPfasCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A3',
          datePrlvt: '2024-06-01',
          analyses,
        }),
      );

      expect(result?.errors).toEqual([
        {
          code: ErrorCode.E2_208,
          params: ['22', '2024-06-01', TFA_CODE],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.verifyRegulatoryPfasCompleteness(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.verifyRegulatoryPfasCompleteness(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11'],
      ['A3', '1'],
    ])('should ignore point %s with finality %s', async (point, finalite) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyRegulatoryPfasCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite }],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.verifyRegulatoryPfasCompleteness(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it('should report one error per incomplete prelevement sharing the same date', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      const secondData = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5979', finalite: '11' }],
      });
      data.ouvrages[0].pointMesure[0].prelevement.push(secondData.ouvrages[0].pointMesure[0].prelevement[0]);

      const result = await service.verifyRegulatoryPfasCompleteness(data);

      expect(result?.errors).toHaveLength(2);
      expect(result?.errors.every((error) => error.evenementType === EvenementType.AVERTISSEMENT)).toBe(true);
    });
  });

  describe('verifyRegulatoryPfasExcludingTfaCompleteness', () => {
    it.each(['A3', 'A4'])('should report missing regulatory PFAS excluding TFA at %s', async (point) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 10000 },
      ]);

      const result = await service.verifyRegulatoryPfasExcludingTfaCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [
            { cdParametre: '5980', finalite: '11' },
            { cdParametre: TFA_CODE, finalite: '11' },
          ],
        }),
      );

      expect(PFAS_REGLEMENTAIRES_CODES).toHaveLength(22);
      expect(PFAS_REGLEMENTAIRES_CODES).not.toContain(TFA_CODE);
      expect(masaProvider.findCapaciteNominaleBatch).toHaveBeenCalledWith(['STEU1'], 2024);
      expect(result).toEqual({
        name: ControleName.CTL209,
        errors: [
          {
            code: ErrorCode.E2_209,
            params: ['1', '2024-06-01', PFAS_REGLEMENTAIRES_CODES.filter((code) => code !== '5980').join(', ')],
            evenementType: EvenementType.AVERTISSEMENT,
          },
        ],
      });
    });

    it('should pass when all 22 regulatory PFAS are present without TFA', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyRegulatoryPfasExcludingTfaCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A4',
          datePrlvt: '2024-06-01',
          analyses: PFAS_REGLEMENTAIRES_CODES.map((cdParametre) => ({ cdParametre, finalite: '11' })),
        }),
      );

      expect(result).toEqual({ name: ControleName.CTL209, errors: [] });
    });

    it('should not count TFA, duplicates, or analyses outside finality 11', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const analyses = PFAS_REGLEMENTAIRES_CODES.filter((code) => code !== '7991').map((cdParametre) => ({
        cdParametre,
        finalite: '11',
      }));
      analyses.push({ cdParametre: '5980', finalite: '11' });
      analyses.push({ cdParametre: '7991', finalite: '1' });
      analyses.push({ cdParametre: TFA_CODE, finalite: '11' });

      const result = await service.verifyRegulatoryPfasExcludingTfaCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: 'A3',
          datePrlvt: '2024-06-01',
          analyses,
        }),
      );

      expect(result?.errors).toEqual([
        {
          code: ErrorCode.E2_209,
          params: ['21', '2024-06-01', '7991'],
          evenementType: EvenementType.AVERTISSEMENT,
        },
      ]);
    });

    it('should not apply below the capacity threshold or without capacity data', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A3',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 9999 },
      ]);

      await expect(service.verifyRegulatoryPfasExcludingTfaCompleteness(data)).resolves.toBeNull();

      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([]);
      await expect(service.verifyRegulatoryPfasExcludingTfaCompleteness(data)).resolves.toBeNull();
    });

    it.each([
      ['A2', '11'],
      ['A3', '1'],
    ])('should ignore point %s with finality %s', async (point, finalite) => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);

      const result = await service.verifyRegulatoryPfasExcludingTfaCompleteness(
        makeFctAssainissement({
          cdOuvrageDepollution: 'STEU1',
          locGlobalePointMesure: point,
          datePrlvt: '2024-06-01',
          analyses: [{ cdParametre: '5980', finalite }],
        }),
      );

      expect(result).toBeNull();
    });

    it('should not call MasaProvider when the reference year is missing', async () => {
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      data.scenario.dateDebutReference = '';

      await expect(service.verifyRegulatoryPfasExcludingTfaCompleteness(data)).resolves.toBeNull();
      expect(masaProvider.findCapaciteNominaleBatch).not.toHaveBeenCalled();
    });

    it('should report one error per incomplete prelevement sharing the same date', async () => {
      masaProvider.findCapaciteNominaleBatch.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU1', capaciteNominaleEH: 12000 },
      ]);
      const data = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5980', finalite: '11' }],
      });
      const secondData = makeFctAssainissement({
        cdOuvrageDepollution: 'STEU1',
        locGlobalePointMesure: 'A4',
        datePrlvt: '2024-06-01',
        analyses: [{ cdParametre: '5979', finalite: '11' }],
      });
      data.ouvrages[0].pointMesure[0].prelevement.push(secondData.ouvrages[0].pointMesure[0].prelevement[0]);

      const result = await service.verifyRegulatoryPfasExcludingTfaCompleteness(data);

      expect(result?.errors).toHaveLength(2);
      expect(result?.errors.every((error) => error.evenementType === EvenementType.AVERTISSEMENT)).toBe(true);
    });
  });
});

function makeFctAssainissement({
  cdOuvrageDepollution,
  locGlobalePointMesure,
  datePrlvt,
  analyses,
}: {
  cdOuvrageDepollution: string;
  locGlobalePointMesure: string;
  datePrlvt: string;
  analyses: Array<{ cdParametre: string; finalite: string; lqAna?: string; rsAnalyse?: string }>;
}): FctAssainissement {
  return {
    scenario: { dateDebutReference: '2024-01-01' },
    ouvrages: [
      {
        cdOuvrageDepollution,
        pointMesure: [
          {
            locGlobalePointMesure,
            prelevement: [
              {
                datePrlvt,
                analyse: analyses,
              },
            ],
          },
        ],
      },
    ],
    systemesCollecte: [],
  } as unknown as FctAssainissement;
}
