import { formatBooleanToOuiNon, formatDate, formatNullable, type PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { BilanSclDto, BilanSteuDto } from './bilan.dto';

export const bilanSteuPropertyToHeaderMapper: PropertyToHeaderMapper<BilanSteuDto> = [
  {
    property: 'bilanEcarteParSpe',
    header: 'Bilan écarté par le SPE (A)',
    value: (row) => formatBooleanToOuiNon(row.bilanEcarteParSpe),
  },
  { property: 'date', header: 'Date', value: (row) => formatDate(row.date) },
  { property: 'parametreNom', header: 'Paramètre', value: (row) => formatNullable(row.parametreNom) },
  { property: 'hcnf', header: 'HCNF', value: (row) => formatNullable(row.hcnf) },
  { property: 'evt', header: 'Evt', value: (row) => formatNullable(row.evt) },
  { property: 'finalite', header: 'Finalité', value: (row) => formatNullable(row.finalite) },
];

export const bilanSclPropertyToHeaderMapper: PropertyToHeaderMapper<BilanSclDto> = [
  { property: 'systemeCollecteNom', header: 'Nom', value: (row) => formatNullable(row.systemeCollecteNom) },
  { property: 'pointMesureNumero', header: 'Point de mesure', value: (row) => formatNullable(row.pointMesureNumero) },
  { property: 'date', header: 'Date', value: (row) => formatDate(row.date) },
  { property: 'volumeDeverse', header: 'Volume déversé (m³)', value: (row) => formatNullable(row.volumeDeverse) },
  {
    property: 'tempsDeversement',
    header: 'Temps de déversement (h)',
    value: (row) => formatNullable(row.tempsDeversement),
  },
  { property: 'statut', header: 'Statut (TP ou TS)', value: (row) => formatNullable(row.statut) },
];
