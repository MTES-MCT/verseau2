import { DataSource } from 'typeorm';
import { createMock } from '@golevelup/ts-jest';
import type { Queue } from '@infra/queue/queue';
import { AntivirusStatus, type AntivirusScanResult } from '@lib/dossier';
import { AddAntivirusAnalysis1793836800000 } from '../../src/infra/migrations/1793836800000-AddAntivirusAnalysis';
import { DepotEntity } from '../../src/dossier/depot/depot.entity';
import { AntivirusAnalysisEntity } from '../../src/dossier/depot/antivirusAnalysis.entity';
import { DepotAntivirusRepository } from '../../src/dossier/depot/depotAntivirus.repository';
import { DepotRepository } from '../../src/dossier/depot/depot.repository';
import { UserEntity } from '../../src/user/user.entity';
import { ControleEntity } from '../../src/dossier/controle/controle.entity';
import { MasaEntity } from '../../src/dossier/masa/masa.entity';
import { getPostgresConnectionUri, startPostgresContainer, stopPostgresContainer } from '../testcontainer.config';

describe('Antivirus analysis migration and one-to-one persistence (PostgreSQL)', () => {
  let db: DataSource;
  let historical: DepotEntity;
  let persistence: DepotAntivirusRepository;
  let depots: DepotRepository;
  const migration = new AddAntivirusAnalysis1793836800000();
  const clean: AntivirusScanResult = {
    verdict: 'clean',
    retryable: false,
    scannedAt: '2026-11-05T12:00:00Z',
    sha256: 'a'.repeat(64),
    engineVersion: '1.4.3',
    signatureVersion: '27800',
    signatureUpdatedAt: '2026-11-05T09:00:00Z',
  };

  beforeAll(async () => {
    await startPostgresContainer();
    db = await new DataSource({
      type: 'postgres',
      url: getPostgresConnectionUri(),
      entities: [DepotEntity, AntivirusAnalysisEntity, UserEntity, ControleEntity, MasaEntity],
      synchronize: true,
    }).initialize();
    const runner = db.createQueryRunner();
    try {
      await runner.dropTable('antivirus_analysis');
      historical = await db.getRepository(DepotEntity).save(
        db.getRepository(DepotEntity).create({
          nomOriginalFichier: 'old.xml',
          tailleFichier: 100,
          type: 'application/xml',
          path: 'processing/old.xml',
        }),
      );
      await migration.up(runner);
    } finally {
      await runner.release();
    }
    persistence = new DepotAntivirusRepository(db, createMock<Queue>());
    depots = new DepotRepository(db);
  });

  afterAll(async () => {
    await db?.destroy();
    await stopPostgresContainer();
  });

  it('does not add depot columns or fabricate historical clean analyses', async () => {
    expect(await db.getRepository(AntivirusAnalysisEntity).count()).toBe(0);
    const depot = await depots.findDepotById(historical.id);
    expect(depot?.antivirusAnalysis).toMatchObject({ status: 'pending', sha256: null });
    const runner = db.createQueryRunner();
    try {
      expect((await runner.getTable('depot'))?.columns.some((column) => column.name.startsWith('antivirus'))).toBe(
        false,
      );
    } finally {
      await runner.release();
    }
  });

  it('matches the TypeORM schema without a follow-up schema rewrite', async () => {
    const diff = await db.driver.createSchemaBuilder().log();
    expect(diff.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('enforces a unique nonnull depot FK, pending default, and complete success evidence', async () => {
    const repository = db.getRepository(AntivirusAnalysisEntity);
    const pending = await repository.save(repository.create({ depotId: historical.id }));
    expect(pending.status).toBe(AntivirusStatus.PENDING);
    await expect(repository.save(repository.create({ depotId: historical.id }))).rejects.toThrow();
    await expect(repository.save(repository.create({ depotId: 'missing' }))).rejects.toThrow();
    await expect(repository.save(repository.create({}))).rejects.toThrow();
    await expect(repository.update(pending.id, { status: AntivirusStatus.CLEAN })).rejects.toThrow();
    await expect(repository.update(pending.id, { sha256: 'INVALID' })).rejects.toThrow();
  });

  it('updates exactly one row across retries, hydrates the relation, and prevents generic overwrite', async () => {
    const repository = db.getRepository(AntivirusAnalysisEntity);
    const original = await repository.findOneByOrFail({ depotId: historical.id });
    await persistence.recordScan(
      historical.id,
      { verdict: 'error', errorCode: 'BUSY', retryable: true, sha256: clean.sha256 },
      historical.path!,
    );
    await persistence.recordScan(historical.id, clean, historical.path!);
    await persistence.recordScan(historical.id, clean, historical.path!);
    expect((await repository.findOneByOrFail({ depotId: historical.id })).id).toBe(original.id);
    expect(await repository.count()).toBe(1);
    expect((await depots.findDepotById(historical.id))?.antivirusAnalysis).toMatchObject({
      status: 'clean',
      filePath: historical.path,
      sha256: clean.sha256,
    });
    const legacyUpdate = { antivirusAnalysis: { status: AntivirusStatus.PENDING }, nomOriginalFichier: 'renamed.xml' };
    expect((await depots.updateDepot(historical.id, legacyUpdate))?.antivirusAnalysis?.status).toBe('clean');
    expect((await repository.findOneByOrFail({ depotId: historical.id })).status).toBe('clean');
  });

  it('serializes concurrent updates so infected wins permanently without duplicate rows', async () => {
    await Promise.all([
      persistence.recordScan(historical.id, clean, historical.path!),
      persistence.recordScan(
        historical.id,
        { ...clean, verdict: 'infected', detection: 'Win.Test.EICAR' },
        historical.path!,
      ),
    ]);
    await expect(persistence.recordScan(historical.id, clean, historical.path!)).resolves.toMatchObject({
      antivirusAnalysis: { status: 'infected', detection: 'Win.Test.EICAR' },
    });
    expect(await db.getRepository(AntivirusAnalysisEntity).count()).toBe(1);
  });

  it('rolls back the additive table without removing depots', async () => {
    const runner = db.createQueryRunner();
    try {
      await migration.down(runner);
      expect(await runner.hasTable('antivirus_analysis')).toBe(false);
    } finally {
      await runner.release();
    }
    expect(await db.getRepository(DepotEntity).count()).toBe(1);
  });
});
