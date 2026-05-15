import { formatDate, formatNullable, type PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import { ConformiteProvisoire, conformiteProvisoireLabel, type ConformiteSteuDto } from './conformite.dto';

function formatConformite(value: string | null): string {
  if (!value) {
    return '-';
  }

  if (Object.values(ConformiteProvisoire).includes(value as ConformiteProvisoire)) {
    return conformiteProvisoireLabel[value as ConformiteProvisoire];
  }

  return value;
}

function formatImpact(value: boolean): string {
  return value ? 'Avec impact' : 'Sans impact';
}

export const conformiteSteuPropertyToHeaderMapper: PropertyToHeaderMapper<ConformiteSteuDto> = [
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
  { property: 'suiviDebutDate', header: 'Début période', value: (row) => formatDate(row.suiviDebutDate) },
  { property: 'suiviFinDate', header: 'Fin période', value: (row) => formatDate(row.suiviFinDate) },
  {
    property: 'conformiteLocaleProvisoire',
    header: 'Conformité réglementaire',
    value: (row) => formatConformite(row.conformiteLocaleProvisoire),
  },
  {
    property: 'impactConformite',
    header: 'Synthèse des changements',
    value: (row) => formatImpact(row.impactConformite),
  },
];
