import type { FctAssainissement, Analyse } from './scenarioAssainissement';

/**
 * Vérifie si un fichier XML parsé constitue un "flux qualifié".
 *
 * Un flux est considéré comme qualifié dès qu'au moins une analyse
 * possède une combinaison (StatutRsAnalyse, QualRsAnalyse) différente de ('A', '4').
 *
 * Les exploitants / MO (rôle DEPOSANT) n'ont pas le droit de déposer un flux qualifié.
 */
export function isFluxQualifie(parsed: FctAssainissement): boolean {
  for (const ouvrage of parsed.ouvrages ?? []) {
    for (const pm of ouvrage.pointMesure ?? []) {
      for (const prlv of pm.prelevement ?? []) {
        if (prlv.analyse?.some((a) => !isAnalyseStandard(a))) {
          return true;
        }
      }
    }
  }

  for (const sc of parsed.systemesCollecte ?? []) {
    for (const pm of sc.pointMesure ?? []) {
      for (const prlv of pm.prelevement ?? []) {
        if (prlv.analyse?.some((a) => !isAnalyseStandard(a))) {
          return true;
        }
      }
    }
  }

  return false;
}

function isAnalyseStandard(analyse: Analyse): boolean {
  return analyse.statutRsAnalyse === 'A' && analyse.qualRsAnalyse === '4';
}
