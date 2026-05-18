import { formatDate } from '@lib/shared';
import { formatNullable, type PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { MesureDto } from './mesure.dto';

function buildPointDeMesure(mesure: MesureDto): string {
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

export const mesurePropertyToHeaderMapper: PropertyToHeaderMapper<MesureDto> = [
  { property: 'prelevementDate', header: 'Date', value: (row) => formatDate(row.prelevementDate) },
  { property: 'pointMesure', header: 'Point de mesure', value: buildPointDeMesure },
  {
    property: 'pointMesureLocalisationCode',
    header: 'Localisation',
    value: (row) => formatNullable(row.pointMesureLocalisationCode),
  },
  {
    property: 'parametre',
    header: 'Paramètre',
    value: (row) => row.parametreNomCourt ?? row.parametreAnalyseCode,
  },
  {
    property: 'resultatAnalyseValeur',
    header: 'Valeur',
    value: (row) => formatNullable(row.resultatAnalyseValeur),
  },
  { property: 'uniteMesureSymbole', header: 'Unité', value: (row) => formatNullable(row.uniteMesureSymbole) },
  {
    property: 'resultatAnalyseQualification',
    header: 'Qualification',
    value: (row) => formatNullable(row.resultatAnalyseQualification),
  },
  { property: 'analyseFinalite', header: 'Finalité', value: (row) => formatNullable(row.analyseFinalite) },
  { property: 'resultatAnalyseStatut', header: 'Statut', value: (row) => formatNullable(row.resultatAnalyseStatut) },
];
