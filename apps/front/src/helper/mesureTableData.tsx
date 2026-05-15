import { formatDate } from '@lib/shared';
import { mesurePropertyToHeaderMapper, type MesureDto } from '@lib/dossier';
import { QualificationBadge } from '../components/QualificationBadge';

export type MesureTableHeaderDefinition = {
  property: string;
  label: string;
};

const MESURE_TABLE_HEADERS: MesureTableHeaderDefinition[] = mesurePropertyToHeaderMapper.map(
  ({ property, header }) => ({
    property,
    label: header,
  }),
);

export function buildMesureTableHeaders(): MesureTableHeaderDefinition[] {
  return MESURE_TABLE_HEADERS;
}

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
