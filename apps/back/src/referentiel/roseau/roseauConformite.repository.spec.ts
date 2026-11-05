import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import type { DataSource } from 'typeorm';
import { RoseauConformiteRepository } from './roseauConformite.repository';

describe('RoseauConformiteRepository.findConformiteSteu', () => {
  let dataSource: DeepMocked<DataSource>;
  let repository: RoseauConformiteRepository;

  beforeEach(() => {
    dataSource = createMock<DataSource>();
    repository = new RoseauConformiteRepository(dataSource);
  });

  it('applies the supplied codes to both count and page queries before pagination', async () => {
    dataSource.query.mockResolvedValueOnce([{ total: 3 }]).mockResolvedValueOnce([]);

    await expect(
      repository.findConformiteSteu({
        ouvrageDepollutionCodes: ['STEU001', 'STEU002'],
        year: 2025,
        page: 2,
        pageSize: 20,
      }),
    ).resolves.toEqual({ data: [], total: 3 });

    expect(dataSource.query.mock.calls).toHaveLength(2);
    for (const [sql, params] of dataSource.query.mock.calls as [string, unknown[]][]) {
      expect(sql).toContain('RTRIM(steu.steu_sandre_cda) IN ($2, $3)');
      expect(sql).not.toContain('steu.steu_cdn IN');
      expect(params.slice(0, 3)).toEqual([2025, 'STEU001', 'STEU002']);
    }
    expect(dataSource.query.mock.calls[1][0]).toContain('LIMIT $4');
    expect(dataSource.query.mock.calls[1][0]).toContain('OFFSET $5');
    expect(dataSource.query.mock.calls[1][1]).toEqual([2025, 'STEU001', 'STEU002', 20, 20]);
  });

  it('does not query when the supplied code list is empty', async () => {
    await expect(
      repository.findConformiteSteu({ ouvrageDepollutionCodes: [], year: 2025, page: 1, pageSize: 20 }),
    ).resolves.toEqual({ data: [], total: 0 });
    expect(dataSource.query.mock.calls).toHaveLength(0);
  });

  it('binds ouvrage codes as parameters rather than SQL text', async () => {
    dataSource.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    const code = "STEU001') OR TRUE --";

    await repository.findConformiteSteu({ ouvrageDepollutionCodes: [code], year: 2025, page: 1, pageSize: 20 });

    for (const [sql, params] of dataSource.query.mock.calls as [string, unknown[]][]) {
      expect(sql).not.toContain(code);
      expect(params[1]).toBe(code);
    }
  });
});

describe('RoseauConformiteRepository.findConformiteScl', () => {
  let dataSource: DeepMocked<DataSource>;
  let repository: RoseauConformiteRepository;

  beforeEach(() => {
    dataSource = createMock<DataSource>();
    repository = new RoseauConformiteRepository(dataSource);
  });

  it('applies the supplied SCL codes to both count and page queries before pagination', async () => {
    dataSource.query.mockResolvedValueOnce([{ total: 3 }]).mockResolvedValueOnce([]);

    await expect(
      repository.findConformiteScl({
        systemeCollecteCodes: ['SCL001', 'SCL002'],
        year: 2025,
        page: 2,
        pageSize: 20,
      }),
    ).resolves.toEqual({ data: [], total: 3 });

    expect(dataSource.query.mock.calls).toHaveLength(2);
    for (const [sql, params] of dataSource.query.mock.calls as [string, unknown[]][]) {
      expect(sql).toContain('RTRIM(scl.scl_sandre_cda) IN ($2, $3)');
      expect(sql).not.toContain('scl.scl_cdn IN');
      expect(sql).not.toContain('steu.steu_cdn IN');
      expect(params.slice(0, 3)).toEqual([2025, 'SCL001', 'SCL002']);
    }
    expect(dataSource.query.mock.calls[1][0]).toContain('LIMIT $4');
    expect(dataSource.query.mock.calls[1][0]).toContain('OFFSET $5');
    expect(dataSource.query.mock.calls[1][1]).toEqual([2025, 'SCL001', 'SCL002', 20, 20]);
  });

  it('does not query when the supplied SCL code list is empty', async () => {
    await expect(
      repository.findConformiteScl({ systemeCollecteCodes: [], year: 2025, page: 1, pageSize: 20 }),
    ).resolves.toEqual({ data: [], total: 0 });
    expect(dataSource.query.mock.calls).toHaveLength(0);
  });

  it('binds SCL codes as parameters rather than SQL text', async () => {
    dataSource.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    const code = "SCL001') OR TRUE --";

    await repository.findConformiteScl({ systemeCollecteCodes: [code], year: 2025, page: 1, pageSize: 20 });

    for (const [sql, params] of dataSource.query.mock.calls as [string, unknown[]][]) {
      expect(sql).not.toContain(code);
      expect(params[1]).toBe(code);
    }
  });
});
