import type { FctAssainissement } from '@lib/parser';
import { filterFctAssainissementForMetierV2 } from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';

function createFctAssainissement(overrides: Partial<FctAssainissement> = {}): FctAssainissement {
  return {
    scenario: {
      codeScenario: SandreScenarioCode.FCT_ASSAIN,
      versionScenario: SandreScenarioVersion.V4,
      dateDebutReference: '',
      dateFinReference: '',
      emetteur: { cdIntervenant: '', nomIntervenant: '' },
    },
    ouvrages: [],
    systemesCollecte: [],
    ...overrides,
  };
}

describe('filterFctAssainissementForMetierV2', () => {
  it('keeps only PointMesure with locGlobalePointMesure A3/A4 and Prlvt with cdSupport=3 (ouvrages + systemesCollecte)', () => {
    const a3PointMesure = {
      numeroPointMesure: 'PM_A3',
      locGlobalePointMesure: 'A3',
      prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-01', analyse: [] }],
    };
    const a4AndNonCdSupport3PointMesure = {
      numeroPointMesure: 'PM_A3',
      locGlobalePointMesure: 'A3',
      prelevement: [
        { cdSupport: '3', datePrlvt: '2024-01-01', analyse: [] },
        { cdSupport: '4', datePrlvt: '2024-01-01', analyse: [] },
      ],
    };
    const nonA3orA4PointMesure = {
      numeroPointMesure: 'PM_S7',
      locGlobalePointMesure: 'S7',
      prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-03', analyse: [] }],
    };
    const input = createFctAssainissement({
      ouvrages: [
        {
          cdOuvrageDepollution: 'STEU_1',
          typeOuvrageDepollution: '',
          nomOuvrageDepollution: '',
          pointMesure: [a3PointMesure, nonA3orA4PointMesure, a4AndNonCdSupport3PointMesure],
        },
      ],
      systemesCollecte: [
        {
          cdSystemeCollecte: 'SC_1',
          lbSystemeCollecte: '',
          pointMesure: [
            {
              numeroPointMesure: 'PM_A4',
              locGlobalePointMesure: 'A4',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-02-01', analyse: [] }],
            },
            {
              numeroPointMesure: 'PM_R1',
              locGlobalePointMesure: 'R1',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-02-02', analyse: [] }],
            },
          ],
        },
      ],
    });

    const output = filterFctAssainissementForMetierV2(input);

    expect(output.ouvrages).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure).toHaveLength(2);
    expect(output.ouvrages[0].pointMesure[0].numeroPointMesure).toBe('PM_A3');
    expect(output.ouvrages[0].pointMesure[0].prelevement).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure[0].prelevement[0].cdSupport).toBe('3');
    expect(output.ouvrages[0].pointMesure).toEqual(expect.arrayContaining([a3PointMesure]));
    expect(output.ouvrages[0].pointMesure).toEqual(
      expect.arrayContaining([
        {
          numeroPointMesure: 'PM_A3',
          locGlobalePointMesure: 'A3',
          prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-01', analyse: [] }],
        },
      ]),
    );
    expect(output.ouvrages[0].pointMesure).not.toEqual(expect.arrayContaining([nonA3orA4PointMesure]));

    expect(output.systemesCollecte).toHaveLength(1);
    expect(output.systemesCollecte[0].pointMesure).toHaveLength(1);
    expect(output.systemesCollecte[0].pointMesure[0].numeroPointMesure).toBe('PM_A4');
  });

  it('drops ouvrages/systemesCollecte entries when all pointMesure are filtered out', () => {
    const input = createFctAssainissement({
      ouvrages: [
        {
          cdOuvrageDepollution: 'STEU_EMPTY',
          typeOuvrageDepollution: '',
          nomOuvrageDepollution: '',
          pointMesure: [
            {
              numeroPointMesure: 'PM_S7',
              locGlobalePointMesure: 'S7',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-03', analyse: [] }],
            },
          ],
        },
      ],
      systemesCollecte: [
        {
          cdSystemeCollecte: 'SC_EMPTY',
          lbSystemeCollecte: '',
          pointMesure: [
            {
              numeroPointMesure: 'PM_A3_WRONG_SUPPORT',
              locGlobalePointMesure: 'A3',
              prelevement: [{ cdSupport: '33', datePrlvt: '2024-01-01', analyse: [] }],
            },
          ],
        },
      ],
    });

    const output = filterFctAssainissementForMetierV2(input);

    expect(output.ouvrages).toEqual([]);
    expect(output.systemesCollecte).toEqual([]);
  });
});
