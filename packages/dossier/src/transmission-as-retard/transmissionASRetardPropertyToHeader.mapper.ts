import { formatDate, formatNullable, type PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { TransmissionASRetardSclDto, TransmissionASRetardSteuDto } from './transmissionASRetard.dto';

function formatRetard(value: number | null): string {
  return value === null ? '-' : `${value} j`;
}

export const transmissionASRetardSteuPropertyToHeaderMapper: PropertyToHeaderMapper<TransmissionASRetardSteuDto> = [
  { property: 'ouvrageDepollutionCode', header: 'Code Sandre', value: (row) => row.ouvrageDepollutionCode },
  { property: 'ouvrageDepollutionNom', header: 'Nom', value: (row) => formatNullable(row.ouvrageDepollutionNom) },
  {
    property: 'trancheObligationLibelle',
    header: "Tranche d'obligation (EH)",
    value: (row) => formatNullable(row.trancheObligationLibelle),
  },
  {
    property: 'capaciteNominaleEH',
    header: 'Capacité nominale (EH)',
    value: (row) => formatNullable(row.capaciteNominaleEH),
  },
  {
    property: 'nbFichiersAsRecus',
    header: 'Nb fichiers AS reçus',
    value: (row) => formatNullable(row.nbFichiersAsRecus),
  },
  {
    property: 'dateDernierFichierRecu',
    header: 'Date dernier fichier reçu',
    value: (row) => formatDate(row.dateDernierFichierRecu),
  },
  { property: 'dateDebutPeriode', header: 'Période début', value: (row) => formatDate(row.dateDebutPeriode) },
  { property: 'dateFinPeriode', header: 'Période fin', value: (row) => formatDate(row.dateFinPeriode) },
  {
    property: 'dateMesureSuivanteAttendue',
    header: 'Date attendue',
    value: (row) => formatDate(row.dateMesureSuivanteAttendue),
  },
  { property: 'nbJoursRetard', header: 'Nb jours de retard', value: (row) => formatRetard(row.nbJoursRetard) },
];

export const transmissionASRetardSclPropertyToHeaderMapper: PropertyToHeaderMapper<TransmissionASRetardSclDto> = [
  { property: 'systemeCollecteCode', header: 'Code Sandre', value: (row) => row.systemeCollecteCode },
  { property: 'systemeCollecteNom', header: 'Nom', value: (row) => formatNullable(row.systemeCollecteNom) },
  {
    property: 'trancheObligationLibelle',
    header: "Tranche d'obligation (EH)",
    value: (row) => formatNullable(row.trancheObligationLibelle),
  },
  {
    property: 'capaciteNominaleEH',
    header: 'Capacité nominale (EH)',
    value: (row) => formatNullable(row.capaciteNominaleEH),
  },
  {
    property: 'nbFichiersAsRecus',
    header: 'Nb fichiers AS reçus',
    value: (row) => formatNullable(row.nbFichiersAsRecus),
  },
  {
    property: 'dateDernierFichierRecu',
    header: 'Date dernier fichier reçu',
    value: (row) => formatDate(row.dateDernierFichierRecu),
  },
  { property: 'dateDebutPeriode', header: 'Période début', value: (row) => formatDate(row.dateDebutPeriode) },
  { property: 'dateFinPeriode', header: 'Période fin', value: (row) => formatDate(row.dateFinPeriode) },
  {
    property: 'dateMesureSuivanteAttendue',
    header: 'Date attendue',
    value: (row) => formatDate(row.dateMesureSuivanteAttendue),
  },
  { property: 'nbJoursRetard', header: 'Nb jours de retard', value: (row) => formatRetard(row.nbJoursRetard) },
];
