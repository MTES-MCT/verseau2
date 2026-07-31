import { FctAssainissement } from '@lib/parser';
import { ErrorCode, EvenementType, ControleName } from '@lib/dossier';
import { MasaProvider } from '@masa/masa.provider';
import { ControleMetierV2Pfas } from './controleMetierV2Pfas';

describe('ControleMetierV2Pfas', () => {
  let service: ControleMetierV2Pfas;
  let masaProvider: jest.Mocked<Pick<MasaProvider, 'findCapaciteNominaleBatch'>>;

  beforeEach(() => {
    masaProvider = {
      findCapaciteNominaleBatch: jest.fn(),
    };
    service = new ControleMetierV2Pfas(masaProvider as unknown as MasaProvider);
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
