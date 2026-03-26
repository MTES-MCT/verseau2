import { formatDate } from '@lib/shared';
import type { MesureDto } from '@lib/dossier';
import { QualificationBadge } from '../components/QualificationBadge';

export function buildPointDeMesure(mesure: MesureDto): string {
  const parts: string[] = [];
  if (mesure.pointMesureLibelle) {
    parts.push(mesure.pointMesureLibelle);
  }
  if (mesure.pointMesureNumero) {
    parts.push(`n°${mesure.pointMesureNumero}`);
  }
  if (mesure.pointAgenceEauNumero) {
    parts.push(`(${mesure.pointAgenceEauNumero})`);
  }
  return parts.join(' ') || '-';
}

export function buildMesureTableRows(mesures: MesureDto[]) {
  return mesures.map((mesure) => [
    formatDate(mesure.prelevementDate),
    buildPointDeMesure(mesure),
    mesure.pointMesureLocalisationCode ?? '-',
    mesure.parametreNomCourt ?? mesure.parametreAnalyseCode,
    mesure.resultatAnalyseValeur !== null && mesure.resultatAnalyseValeur !== undefined
      ? String(mesure.resultatAnalyseValeur)
      : '-',
    mesure.uniteMesureSymbole ?? '-',
    <QualificationBadge key="qual" qualification={mesure.resultatAnalyseQualification} />,
    mesure.analyseFinalite ?? '-',
    mesure.resultatAnalyseStatut ?? '-',
  ]);
}
