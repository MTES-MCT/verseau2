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

    expect(result.errors).toHaveLength(0);
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

    expect(result.errors).toHaveLength(0);
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

    expect(outsideA4Result.errors).toHaveLength(0);
    expect(outsideFinalityResult.errors).toHaveLength(0);
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
    expect(result.errors).toHaveLength(0);
  });

  it('should detect PFAS campaigns only for finality 11 and regulatory PFAS codes', () => {
    expect(service.isPfasCampaign([{ cdParametre: '5980', finalite: '11' }])).toBe(true);
    expect(service.isPfasCampaign([{ cdParametre: '8986', finalite: '11' }])).toBe(false);
    expect(service.isPfasCampaign([{ cdParametre: '5980', finalite: '1' }])).toBe(false);
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
  analyses: Array<{ cdParametre: string; finalite: string }>;
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
