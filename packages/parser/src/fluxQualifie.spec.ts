import { isFluxQualifie } from './fluxQualifie';
import type { FctAssainissement, Analyse } from './scenarioAssainissement';
import { SandreScenarioCode, SandreScenarioVersion } from './sandreConstants';

function makeAnalyse(statutRsAnalyse: string, qualRsAnalyse: string): Analyse {
  return {
    rsAnalyse: '0',
    inSituAnalyse: '1',
    statutRsAnalyse,
    qualRsAnalyse,
    cdMethode: '1',
    cdParametre: '1552',
    cdUniteMesure: '115',
    finalite: '1',
    accreAna: '',
    cdRemAnalyse: '1',
  };
}

function makeFctAssainissement(
  ouvrageAnalyses: Analyse[][] = [],
  systemeAnalyses: Analyse[][] = [],
): FctAssainissement {
  return {
    scenario: {
      codeScenario: SandreScenarioCode.FCT_ASSAIN,
      versionScenario: SandreScenarioVersion.V4,
      dateDebutReference: '2024-01-01',
      emetteur: { cdIntervenant: '00000000000000', nomIntervenant: 'Test' },
    },
    ouvrages: ouvrageAnalyses.map((analyses, i) => ({
      cdOuvrageDepollution: `OUVRAGE_${i}`,
      typeOuvrageDepollution: '4',
      pointMesure: [
        {
          numeroPointMesure: `PM_${i}`,
          prelevement: [{ analyse: analyses }],
        },
      ],
    })),
    systemesCollecte: systemeAnalyses.map((analyses, i) => ({
      cdSystemeCollecte: `SCL_${i}`,
      pointMesure: [
        {
          numeroPointMesure: `PM_SCL_${i}`,
          prelevement: [{ analyse: analyses }],
        },
      ],
    })),
  };
}

describe('isFluxQualifie', () => {
  it('should return false when all analyses have StatutRsAnalyse=A and QualRsAnalyse=4', () => {
    const fct = makeFctAssainissement([[makeAnalyse('A', '4'), makeAnalyse('A', '4')]], [[makeAnalyse('A', '4')]]);
    expect(isFluxQualifie(fct)).toBe(false);
  });

  it('should return true when one ouvrage analyse has a different StatutRsAnalyse', () => {
    const fct = makeFctAssainissement([[makeAnalyse('A', '4'), makeAnalyse('B', '4')]]);
    expect(isFluxQualifie(fct)).toBe(true);
  });

  it('should return true when one ouvrage analyse has a different QualRsAnalyse', () => {
    const fct = makeFctAssainissement([[makeAnalyse('A', '4'), makeAnalyse('A', '3')]]);
    expect(isFluxQualifie(fct)).toBe(true);
  });

  it('should return true when one ouvrage analyse has both different StatutRsAnalyse and QualRsAnalyse', () => {
    const fct = makeFctAssainissement([[makeAnalyse('A', '4'), makeAnalyse('C', '1')]]);
    expect(isFluxQualifie(fct)).toBe(true);
  });

  it('should return true when a systeme collecte analyse has a non-standard combination', () => {
    const fct = makeFctAssainissement([[makeAnalyse('A', '4')]], [[makeAnalyse('A', '2')]]);
    expect(isFluxQualifie(fct)).toBe(true);
  });

  it('should return false when there are no analyses at all', () => {
    const fct = makeFctAssainissement([], []);
    expect(isFluxQualifie(fct)).toBe(false);
  });

  it('should return false when ouvrages and systemes have empty prelevements', () => {
    const fct: FctAssainissement = {
      scenario: {
        codeScenario: SandreScenarioCode.FCT_ASSAIN,
        versionScenario: SandreScenarioVersion.V4,
        dateDebutReference: '2024-01-01',
        emetteur: { cdIntervenant: '00000000000000', nomIntervenant: 'Test' },
      },
      ouvrages: [
        {
          cdOuvrageDepollution: 'OUVRAGE_1',
          typeOuvrageDepollution: '4',
          pointMesure: [{ numeroPointMesure: 'PM1', prelevement: [] }],
        },
      ],
      systemesCollecte: [],
    };
    expect(isFluxQualifie(fct)).toBe(false);
  });

  it('should detect flux qualifie even if only the last analyse in a deep structure is non-standard', () => {
    const fct = makeFctAssainissement(
      [[makeAnalyse('A', '4'), makeAnalyse('A', '4')], [makeAnalyse('A', '4')]],
      [[makeAnalyse('A', '4'), makeAnalyse('A', '4'), makeAnalyse('A', '5')]],
    );
    expect(isFluxQualifie(fct)).toBe(true);
  });
});
