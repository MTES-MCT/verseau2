export type CsvCellValue = string | number | boolean | Date | null | undefined;

export type PropertyToHeaderMapper<T> = ReadonlyArray<{
  property: string;
  header: string;
  value: (row: T) => CsvCellValue;
}>;

export function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
}

export function formatBooleanToOuiNon(value: boolean): string {
  return value ? 'Oui' : 'Non';
}

export function formatDate(date: Date | string | null): string {
  if (!date) {
    return '-';
  }

  const normalizedDate = typeof date === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date) : date;

  return normalizedDate.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
