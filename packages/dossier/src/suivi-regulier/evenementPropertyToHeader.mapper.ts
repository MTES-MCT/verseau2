import { formatDate } from '@lib/shared';
import { formatNullable, type PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { EvenementSclDto, EvenementSteuDto } from './evenement.dto';

function formatPrisEnCompte(value: boolean): string {
  return value ? 'Pris en compte' : 'Non pris en compte';
}

function formatTypeEvenement(row: EvenementSteuDto | EvenementSclDto): string {
  return `${row.typeEvenementCode}-${row.typeEvenementLibelle}`;
}

function formatPointMesure(row: EvenementSclDto): string {
  return `${row.pointMesureNumero} - ${row.pointMesureLibelle ?? '-'}`;
}

export const evenementSteuPropertyToHeaderMapper: PropertyToHeaderMapper<EvenementSteuDto> = [
  {
    property: 'prisEnCompte',
    header: 'Pris en compte',
    value: (row) => formatPrisEnCompte(row.prisEnCompte),
  },
  { property: 'ouvrageDepollutionCode', header: 'Code Sandre', value: (row) => row.ouvrageDepollutionCode },
  { property: 'ouvrageDepollutionNom', header: 'Nom', value: (row) => formatNullable(row.ouvrageDepollutionNom) },
  { property: 'date', header: 'Date', value: (row) => formatDate(row.date) },
  { property: 'typeEvenement', header: "Type d'événement", value: formatTypeEvenement },
  { property: 'finalite', header: 'Finalité', value: (row) => formatNullable(row.finalite) },
  { property: 'commentaire', header: 'Commentaire', value: (row) => formatNullable(row.commentaire) },
];

export const evenementSclPropertyToHeaderMapper: PropertyToHeaderMapper<EvenementSclDto> = [
  {
    property: 'prisEnCompte',
    header: 'Pris en compte',
    value: (row) => formatPrisEnCompte(row.prisEnCompte),
  },
  { property: 'systemeCollecteCode', header: 'Code Sandre', value: (row) => row.systemeCollecteCode },
  { property: 'systemeCollecteNom', header: 'Nom', value: (row) => formatNullable(row.systemeCollecteNom) },
  { property: 'date', header: 'Date', value: (row) => formatDate(row.date) },
  { property: 'typeEvenement', header: "Type d'événement", value: formatTypeEvenement },
  { property: 'finalite', header: 'Finalité', value: (row) => formatNullable(row.finalite) },
  { property: 'commentaire', header: 'Commentaire', value: (row) => formatNullable(row.commentaire) },
  { property: 'pointMesure', header: 'Point de mesures', value: formatPointMesure },
];
