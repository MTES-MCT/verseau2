import { ConformiteProvisoire, conformiteProvisoireLabel } from '@lib/dossier';
import { formatDate } from '@lib/shared';

export function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
}

export function formatBooleanToOuiNon(value: boolean): string {
  return value ? 'Oui' : 'Non';
}

export function formatPrisEnCompte(value: boolean): string {
  return value ? 'Pris en compte' : 'Non pris en compte';
}

export function formatConformite(value: string | null): string {
  if (!value) {
    return '-';
  }

  if (Object.values(ConformiteProvisoire).includes(value as ConformiteProvisoire)) {
    return conformiteProvisoireLabel[value as ConformiteProvisoire];
  }

  return value;
}

export function formatImpact(value: boolean): string {
  return value ? 'Avec impact' : 'Sans impact';
}

export function formatRetard(value: number | null): string {
  return value === null ? '-' : `${value} j`;
}

export function formatDisplayedDate(value: Date | string | null): string {
  return formatDate(value);
}
