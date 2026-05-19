import { BadRequestException, Injectable } from '@nestjs/common';
import { EXPORT_MAX_ROWS, EXPORT_PAGE_SIZE } from './csv.constants';

type PaginatedResult<T> = {
  data: T[];
  total: number;
};

@Injectable()
export class PaginatedExportService {
  async collectAllRows<T>(fetchPage: (page: number, pageSize: number) => Promise<PaginatedResult<T>>): Promise<T[]> {
    const firstPage = await fetchPage(1, EXPORT_PAGE_SIZE);

    if (firstPage.total > EXPORT_MAX_ROWS) {
      throw new BadRequestException(`Export limité à ${EXPORT_MAX_ROWS} lignes.`);
    }

    if (firstPage.total <= firstPage.data.length) {
      return firstPage.data;
    }

    const rows = [...firstPage.data];
    const totalPages = Math.ceil(firstPage.total / EXPORT_PAGE_SIZE);

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await fetchPage(page, EXPORT_PAGE_SIZE);
      rows.push(...nextPage.data);
    }

    return rows;
  }
}
