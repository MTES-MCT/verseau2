import type { DataSource } from 'typeorm';
import { RoseauConformiteRepository } from './roseauConformite.repository';

describe('RoseauConformiteRepository.findConformiteScl', () => {
  const query = jest.fn();
  const repository = new RoseauConformiteRepository({ query } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
  });

  it('restricts both count and page to authorized SCL IDs, even when filtering by code', async () => {
    query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);

    await repository.findConformiteScl({
      systemeCollecteIds: [201],
      systemeCollecteCode: 'SCL002',
      year: 2025,
      page: 1,
      pageSize: 20,
    });

    expect(query).toHaveBeenCalledTimes(2);
    for (const [sql, params] of query.mock.calls as [string, unknown[]][]) {
      expect(sql).toContain('scl.scl_cdn IN ($2)');
      expect(sql).toContain('RTRIM(scl.scl_sandre_cda) = $3');
      expect(sql).not.toContain('steu.steu_cdn IN');
      expect(params.slice(0, 3)).toEqual([2025, 201, 'SCL002']);
    }
  });

  it('does not query when no SCL is authorized', async () => {
    await expect(
      repository.findConformiteScl({ systemeCollecteIds: [], year: 2025, page: 1, pageSize: 20 }),
    ).resolves.toEqual({ data: [], total: 0 });
    expect(query).not.toHaveBeenCalled();
  });
});
