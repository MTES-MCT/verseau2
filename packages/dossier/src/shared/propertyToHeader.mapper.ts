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
