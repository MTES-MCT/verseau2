import { BadRequestException } from '@nestjs/common';
import { PaginatedExportService } from './paginatedExport.service';

describe('PaginatedExportService', () => {
  let service: PaginatedExportService;

  beforeEach(() => {
    service = new PaginatedExportService();
  });

  it('collects all pages with pageSize 1000', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, index) => index + 1), total: 1002 })
      .mockResolvedValueOnce({ data: [1001, 1002], total: 1002 });

    const result = await service.collectAllRows(fetchPage);

    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 1000);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 1000);
    expect(result).toHaveLength(1002);
  });

  it('throws when total exceeds export limit', async () => {
    await expect(service.collectAllRows(async () => ({ data: [], total: 12001 }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
