import { formatDate } from '@lib/shared';
import type { MesureDto } from '@lib/dossier';
import { QualificationBadge } from '../components/QualificationBadge';

export function buildPointDeMesure(mesure: MesureDto): string {
  const parts: string[] = [];
  if (mesure.libellePointMesure) {
    parts.push(mesure.libellePointMesure);
  }
  if (mesure.numeroPointMesure) {
    parts.push(`n°${mesure.numeroPointMesure}`);
  }
  if (mesure.numeroPointAgenceEau) {
    parts.push(`(${mesure.numeroPointAgenceEau})`);
  }
  return parts.join(' ') || '-';
}

export function buildMesureTableRows(mesures: MesureDto[]) {
  return mesures.map((mesure) => [
    formatDate(mesure.datePrelevement),
    buildPointDeMesure(mesure),
    mesure.codeLocalisationPointMesure ?? '-',
    mesure.nomCourtParametre ?? mesure.codeParametreAnalyse,
    mesure.valeurResultatAnalyse !== null && mesure.valeurResultatAnalyse !== undefined
      ? String(mesure.valeurResultatAnalyse)
      : '-',
    mesure.symboleUniteMesure ?? '-',
    <QualificationBadge key="qual" qualification={mesure.qualificationResultatAnalyse} />,
    mesure.finaliteAnalyse ?? '-',
    mesure.statutResultatAnalyse ?? '-',
  ]);
}
