export type CsvCellValue = string | number | boolean | Date | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvCellValue;
}

export interface CsvGenerator {
  generate<T>(columns: ReadonlyArray<CsvColumn<T>>, rows: ReadonlyArray<T>): string;
}

export const CsvGenerator = Symbol('CsvGenerator');

// TODO: déplacer dans back/