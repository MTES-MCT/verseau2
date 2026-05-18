import { formatDate } from '@lib/shared';
import { buildPointDeMesure, mesurePropertyToHeaderMapper, type MesureDto } from '@lib/dossier';
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
