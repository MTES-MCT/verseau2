/**
 * Shared test fixtures for FctAssainissement and related types.
 * Use these helpers to create consistent test data across e2e tests.
 */

import type { Analyse, Emetteur, FctAssainissement, OuvrageDepollution, SystemeCollecte } from '@lib/parser';
import { SandreScenarioCode, SandreScenarioVersion } from '@lib/parser/src/sandreConstants';

/**
 * Partial type for overriding FctAssainissement properties in tests.
 */
export type PartialFctAssainissement = {
  scenario?: {
    emetteur: Partial<Emetteur>;
    destinataire?: Partial<Emetteur>;
    codeScenario: string;
    versionScenario: string;
    dateDebutReference?: string;
    dateFinReference?: string;
  };
  ouvrages?: Partial<OuvrageDepollution>[];
  systemesCollecte?: Partial<SystemeCollecte>[];
};

/**
 * Create a minimal Analyse object for testing.
 *
 * @param cdParametre - The parameter code (e.g., CodeParametre.DCO)
 * @param rsAnalyse - The analysis result value
 * @param overrides - Additional properties to override
 */
export function createTestAnalyse(cdParametre: string, rsAnalyse: string, overrides: Partial<Analyse> = {}): Analyse {
  return {
    cdParametre,
    rsAnalyse,
    inSituAnalyse: '',
    statutRsAnalyse: '',
    qualRsAnalyse: '',
    cdMethode: '',
    cdUniteMesure: '',
    finalite: '',
    accreAna: '',
    cdRemAnalyse: '',
    ...overrides,
  };
}

/**
 * Create a minimal FctAssainissement object for testing.
 *
 * This helper:
 * - Sets sensible defaults for scenario, ouvrages, and systemesCollecte
 * - Applies default locGlobalePointMesure ('A3') and cdSupport ('3') to pass filtering
 * - Allows full customization through the overrides parameter
 *
 * @param overrides - Properties to override in the FctAssainissement
 */
export function createTestFctAssainissement(overrides: PartialFctAssainissement = {}): FctAssainissement {
  const fct = {
    scenario: {
      emetteur: {},
      codeScenario: SandreScenarioCode.FCT_ASSAIN,
      versionScenario: SandreScenarioVersion.V4,
    },
    ouvrages: [],
    systemesCollecte: [],
    ...overrides,
  } as FctAssainissement;

  // Apply default values for filtering (locGlobalePointMesure and cdSupport)
  // This ensures tests pass through the metier v2 filtering by default
  for (const ouvrage of fct.ouvrages ?? []) {
    for (const pointMesure of ouvrage.pointMesure ?? []) {
      pointMesure.locGlobalePointMesure ??= 'A3';
      for (const prelevement of pointMesure.prelevement ?? []) {
        prelevement.cdSupport ??= '3';
      }
    }
  }
  for (const systemeCollecte of fct.systemesCollecte ?? []) {
    for (const pointMesure of systemeCollecte.pointMesure ?? []) {
      pointMesure.locGlobalePointMesure ??= 'A3';
      for (const prelevement of pointMesure.prelevement ?? []) {
        prelevement.cdSupport ??= '3';
      }
    }
  }

  return fct;
}

/**
 * Create a minimal ouvrage with point de mesure for testing.
 *
 * @param cdOuvrageDepollution - The ouvrage code
 * @param pointMesureConfig - Configuration for the point de mesure
 */
export function createTestOuvrage(
  cdOuvrageDepollution: string,
  pointMesureConfig?: {
    numeroPointMesure?: string;
    locGlobalePointMesure?: string;
    prelevements?: Array<{
      datePrlvt?: string;
      cdSupport?: string;
      analyses?: Analyse[];
    }>;
  },
): Partial<OuvrageDepollution> {
  const { numeroPointMesure = 'PM001', locGlobalePointMesure = 'A3', prelevements = [] } = pointMesureConfig ?? {};

  return {
    cdOuvrageDepollution,
    pointMesure: [
      {
        numeroPointMesure,
        locGlobalePointMesure,
        prelevement: prelevements.map((p) => ({
          datePrlvt: p.datePrlvt ?? '2024-01-15',
          cdSupport: p.cdSupport ?? '3',
          analyse: p.analyses ?? [],
        })),
      },
    ],
  };
}
