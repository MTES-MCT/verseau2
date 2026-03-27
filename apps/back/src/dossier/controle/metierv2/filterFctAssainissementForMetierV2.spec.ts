import type { FctAssainissement } from '@lib/parser';
import {
  filterFctAssainissementForMetierV2,
  type FilterFctAssainissementForMetierVOptions,
} from '@dossier/controle/metierv2/filterFctAssainissementForMetierV2';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';

const defaultOptions: FilterFctAssainissementForMetierVOptions = {
  allowedLocGlobalePointMesure: ['A3', 'A4'],
  allowedCdSupport: '3',
};

function createFctAssainissement(overrides: Partial<FctAssainissement> = {}): FctAssainissement {
  return {
    scenario: {
      codeScenario: SandreScenarioCode.FCT_ASSAIN,
      versionScenario: SandreScenarioVersion.V4,
      dateDebutReference: '',
      emetteur: { cdIntervenant: '', nomIntervenant: '' }, // nomIntervenant commented out - unused by controleV1 and controleMetierV2 services
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
          // nomOuvrageDepollution commented out - unused by controleV1 and controleMetierV2 services
          pointMesure: [a3PointMesure, nonA3orA4PointMesure, a4AndNonCdSupport3PointMesure],
        },
      ],
      systemesCollecte: [
        {
          cdSystemeCollecte: 'SC_1',
          // lbSystemeCollecte commented out - unused by controleV1 and controleMetierV2 services
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

    const output = filterFctAssainissementForMetierV2(input, defaultOptions);

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
          // nomOuvrageDepollution commented out - unused by controleV1 and controleMetierV2 services
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
          // lbSystemeCollecte commented out - unused by controleV1 and controleMetierV2 services
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

    const output = filterFctAssainissementForMetierV2(input, defaultOptions);

    expect(output.ouvrages).toEqual([]);
    expect(output.systemesCollecte).toEqual([]);
  });

  it('filters with allowedCdSupport as array: keeps prélèvements with cdSupport 3, 4, or 5 and drops others', () => {
    const options: FilterFctAssainissementForMetierVOptions = {
      allowedLocGlobalePointMesure: ['A3'],
      allowedCdSupport: ['3', '4', '5'],
    };

    const input = createFctAssainissement({
      ouvrages: [
        {
          cdOuvrageDepollution: 'STEU_1',
          typeOuvrageDepollution: '',
          pointMesure: [
            {
              numeroPointMesure: 'PM_A3',
              locGlobalePointMesure: 'A3',
              prelevement: [
                { cdSupport: '3', datePrlvt: '2024-01-01', analyse: [] },
                { cdSupport: '4', datePrlvt: '2024-01-02', analyse: [] },
                { cdSupport: '5', datePrlvt: '2024-01-03', analyse: [] },
                { cdSupport: '1', datePrlvt: '2024-01-04', analyse: [] },
                { cdSupport: '2', datePrlvt: '2024-01-05', analyse: [] },
              ],
            },
          ],
        },
      ],
    });

    const output = filterFctAssainissementForMetierV2(input, options);

    expect(output.ouvrages).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure[0].prelevement).toHaveLength(3);
    expect(output.ouvrages[0].pointMesure[0].prelevement.map((p) => p.cdSupport)).toEqual(['3', '4', '5']);
  });

  it('filters with allowedLocGlobalePointMesurePrefixes: keeps S1, A3, A4, drops M1, R1', () => {
    const options: FilterFctAssainissementForMetierVOptions = {
      allowedLocGlobalePointMesurePrefixes: ['S', 'A'],
      allowedCdSupport: '3',
    };

    const input = createFctAssainissement({
      ouvrages: [
        {
          cdOuvrageDepollution: 'STEU_1',
          typeOuvrageDepollution: '',
          pointMesure: [
            {
              numeroPointMesure: 'PM_S1',
              locGlobalePointMesure: 'S1',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-01', analyse: [] }],
            },
            {
              numeroPointMesure: 'PM_A3',
              locGlobalePointMesure: 'A3',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-02', analyse: [] }],
            },
            {
              numeroPointMesure: 'PM_A4',
              locGlobalePointMesure: 'A4',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-03', analyse: [] }],
            },
            {
              numeroPointMesure: 'PM_M1',
              locGlobalePointMesure: 'M1',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-04', analyse: [] }],
            },
            {
              numeroPointMesure: 'PM_R1',
              locGlobalePointMesure: 'R1',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-01-05', analyse: [] }],
            },
          ],
        },
      ],
    });

    const output = filterFctAssainissementForMetierV2(input, options);

    expect(output.ouvrages).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure).toHaveLength(3);
    expect(output.ouvrages[0].pointMesure.map((pm) => pm.locGlobalePointMesure)).toEqual(['S1', 'A3', 'A4']);
  });

  it('filters with custom options: locGlobalePointMesure A1/R1 and cdSupport=A3', () => {
    const customOptions: FilterFctAssainissementForMetierVOptions = {
      allowedLocGlobalePointMesure: ['A1', 'R1'],
      allowedCdSupport: 'A3',
    };

    const input = createFctAssainissement({
      ouvrages: [
        {
          cdOuvrageDepollution: 'STEU_1',
          typeOuvrageDepollution: '',
          pointMesure: [
            {
              numeroPointMesure: 'PM_A1_MATCH',
              locGlobalePointMesure: 'A1',
              prelevement: [
                { cdSupport: 'A3', datePrlvt: '2024-01-01', analyse: [] },
                { cdSupport: '3', datePrlvt: '2024-01-02', analyse: [] },
              ],
            },
            {
              numeroPointMesure: 'PM_A3_NO_MATCH',
              locGlobalePointMesure: 'A3',
              prelevement: [{ cdSupport: 'A3', datePrlvt: '2024-01-03', analyse: [] }],
            },
          ],
        },
      ],
      systemesCollecte: [
        {
          cdSystemeCollecte: 'SC_1',
          pointMesure: [
            {
              numeroPointMesure: 'PM_R1_MATCH',
              locGlobalePointMesure: 'R1',
              prelevement: [{ cdSupport: 'A3', datePrlvt: '2024-02-01', analyse: [] }],
            },
            {
              numeroPointMesure: 'PM_R1_WRONG_SUPPORT',
              locGlobalePointMesure: 'R1',
              prelevement: [{ cdSupport: '3', datePrlvt: '2024-02-02', analyse: [] }],
            },
          ],
        },
      ],
    });

    const output = filterFctAssainissementForMetierV2(input, customOptions);

    expect(output.ouvrages).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure[0].numeroPointMesure).toBe('PM_A1_MATCH');
    expect(output.ouvrages[0].pointMesure[0].prelevement).toHaveLength(1);
    expect(output.ouvrages[0].pointMesure[0].prelevement[0].cdSupport).toBe('A3');

    expect(output.systemesCollecte).toHaveLength(1);
    expect(output.systemesCollecte[0].pointMesure).toHaveLength(1);
    expect(output.systemesCollecte[0].pointMesure[0].numeroPointMesure).toBe('PM_R1_MATCH');
    expect(output.systemesCollecte[0].pointMesure[0].prelevement).toHaveLength(1);
    expect(output.systemesCollecte[0].pointMesure[0].prelevement[0].cdSupport).toBe('A3');
  });
});
