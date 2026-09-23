import { Injectable } from '@nestjs/common';
import type { CsvColumn, CsvGenerator } from './csv.types';

@Injectable()
export class CsvGeneratorService implements CsvGenerator {
  generate<T>(columns: ReadonlyArray<CsvColumn<T>>, rows: ReadonlyArray<T>): string {
    const headers = columns.map((column) => this.escapeCsvValue(column.header));
    const dataRows = rows.map((row) => columns.map((column) => this.escapeCsvValue(column.value(row))).join(','));

    return [`\uFEFF${headers.join(',')}`, ...dataRows].join('\r\n');
  }

  private escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let normalizedValue: string;
    if (value instanceof Date) {
      normalizedValue = value.toISOString();
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      normalizedValue = String(value);
    } else {
      normalizedValue = JSON.stringify(value) ?? '';
    }

    const escapedValue = normalizedValue.replace(/"/g, '""');

    return `"${escapedValue}"`;
  }
}
