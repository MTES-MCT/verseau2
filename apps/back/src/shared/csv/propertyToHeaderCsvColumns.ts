import type { PropertyToHeaderMapper } from '@lib/dossier';
import type { CsvCellValue, CsvColumn } from '@lib/shared';

export type CsvFormattedRow = Record<string, CsvCellValue>;

export function buildCsvColumnsFromPropertyToHeaderMapper(
  mapper: PropertyToHeaderMapper<unknown>,
): ReadonlyArray<CsvColumn<CsvFormattedRow>> {
  return mapper.map(({ property, header }) => ({
    header,
    value: (row) => row[property],
  }));
}
