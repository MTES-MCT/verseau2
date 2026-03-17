import { formatDate } from '@lib/shared';
import type { MesureDto } from '@lib/dossier';
import { QualificationBadge } from '../components/QualificationBadge';

export function buildPointDeMesure(mesure: MesureDto): string {
  const parts: string[] = [];
  if (mesure.nomPoint) {
    parts.push(mesure.nomPoint);
  }
  if (mesure.numPoint) {
    parts.push(`n°${mesure.numPoint}`);
  }
  if (mesure.numPointAgence) {
    parts.push(`(${mesure.numPointAgence})`);
  }
  return parts.join(' ') || '-';
}

export function buildMesureTableRows(mesures: MesureDto[]) {
  return mesures.map((mesure) => [
    formatDate(mesure.date),
    buildPointDeMesure(mesure),
    mesure.localisationPoint ?? '-',
    mesure.parametreNom ?? mesure.parametreCode,
    mesure.valeur !== null && mesure.valeur !== undefined ? String(mesure.valeur) : '-',
    mesure.unite ?? '-',
    <QualificationBadge key="qual" qualification={mesure.qualification} />,
    mesure.finalite ?? '-',
    mesure.statut ?? '-',
  ]);
}
