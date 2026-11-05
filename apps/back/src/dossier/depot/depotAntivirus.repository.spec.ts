/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { DataSource, EntityManager } from 'typeorm';
import { type AntivirusScanResponse, type AntivirusScanResult } from '@lib/dossier';
import { DepotEntity } from './depot.entity';
import { AntivirusAnalysisEntity } from './antivirusAnalysis.entity';
import { DepotAntivirusRepository } from './depotAntivirus.repository';
import { mapDepotEntityToModel, mapDepotEntityToDepotDto } from './depot.mapper';
import { QueueName, type Queue } from '@queue/queue';
import { DepotStep, DepotStatus } from '@lib/dossier';

describe('DepotAntivirusRepository one-to-one persistence', () => {
  const path = 'processing/frozen.xml';
  const clean: AntivirusScanResult = {
    verdict: 'clean',
    retryable: false,
    scannedAt: '2026-11-05T12:00:00Z',
    sha256: 'a'.repeat(64),
    engineVersion: '1.4.3',
    signatureVersion: '27800',
    signatureUpdatedAt: '2026-11-05T09:00:00Z',
  };
  const infected: AntivirusScanResult = { ...clean, verdict: 'infected', detection: 'Win.Test.EICAR_HDB-1' };
  const failure: AntivirusScanResponse = {
    verdict: 'error',
    errorCode: 'CLAMD_UNAVAILABLE',
    retryable: true,
    sha256: clean.sha256,
  };
  let manager: ReturnType<typeof createMock<EntityManager>>;
  let dataSource: ReturnType<typeof createMock<DataSource>>;
  let repository: DepotAntivirusRepository;
  let depot: DepotEntity;
  let analysis: AntivirusAnalysisEntity | null;
  let queue: ReturnType<typeof createMock<Queue>>;
  const record = (response: AntivirusScanResponse) => repository.recordScan('dep_test', response, path);

  beforeEach(() => {
    manager = createMock<EntityManager>();
    dataSource = createMock<DataSource>();
    dataSource.transaction.mockImplementation(async (...args) => {
      const operation = args.find((arg) => typeof arg === 'function');
      if (typeof operation !== 'function') {
        throw new Error('Expected transaction callback');
      }
      const snapshot = analysis ? Object.assign(new AntivirusAnalysisEntity(), analysis) : null;
      try {
        return await operation(manager);
      } catch (error) {
        analysis = snapshot;
        throw error;
      }
    });
    depot = Object.assign(new DepotEntity(), { id: 'dep_test', path });
    analysis = null;
    manager.findOne.mockImplementation((target) => Promise.resolve(target === DepotEntity ? depot : analysis));
    manager.save.mockImplementation((value) => {
      if (value instanceof AntivirusAnalysisEntity) {
        analysis = value;
      }
      return Promise.resolve(value);
    });
    queue = createMock<Queue>();
    queue.send.mockResolvedValue('job-id');
    repository = new DepotAntivirusRepository(dataSource, queue);
  });

  it('normalizes absent or unloaded relations to pending in the model and public DTO', () => {
    for (const value of [undefined, null]) {
      depot.antivirusAnalysis = value;
      const model = mapDepotEntityToModel(depot);
      expect(model.antivirusAnalysis).toMatchObject({ status: 'pending', sha256: null, filePath: null });
      expect(mapDepotEntityToDepotDto(model).antivirusStatus).toBe('pending');
    }
  });

  it('locks the parent before lazy creation and persists complete evidence in the analysis only', async () => {
    await expect(record(clean)).resolves.toMatchObject({
      antivirusAnalysis: {
        depotId: depot.id,
        filePath: path,
        status: 'clean',
        sha256: clean.sha256,
        scannedAt: new Date(clean.scannedAt),
        engineVersion: clean.engineVersion,
        signatureVersion: clean.signatureVersion,
        signatureUpdatedAt: new Date(clean.signatureUpdatedAt),
        detection: null,
        errorCode: null,
        retryable: false,
      },
    });
    expect(manager.findOne).toHaveBeenNthCalledWith(1, DepotEntity, {
      where: { id: 'dep_test' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.findOne).toHaveBeenNthCalledWith(2, AntivirusAnalysisEntity, { where: { depotId: 'dep_test' } });
    expect(manager.save).toHaveBeenCalledWith(expect.any(AntivirusAnalysisEntity));
    expect(depot).not.toHaveProperty('antivirusStatus');
  });

  it('updates the same row across retries and makes duplicate success a no-op', async () => {
    await expect(record(failure)).resolves.toMatchObject({
      antivirusAnalysis: { status: 'error', errorCode: 'CLAMD_UNAVAILABLE', scannedAt: null, retryable: true },
    });
    const id = analysis?.id;
    await expect(record(clean)).resolves.toMatchObject({
      antivirusAnalysis: { status: 'clean', errorCode: null, retryable: false },
    });
    expect(analysis?.id).toBe(id);
    manager.save.mockClear();
    await record(clean);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('keeps deterministic scan-limit failures distinct from infection', async () => {
    await expect(
      record({ verdict: 'unscannable', errorCode: 'SCAN_LIMIT_EXCEEDED', retryable: false }),
    ).resolves.toMatchObject({
      antivirusAnalysis: { status: 'error', errorCode: 'SCAN_LIMIT_EXCEEDED', retryable: false },
    });
  });

  it('never permits late clean/error/unscannable to erase terminal infection', async () => {
    await record(infected);
    const snapshot = mapDepotEntityToModel(depot);
    manager.save.mockClear();
    for (const response of [
      clean,
      failure,
      { verdict: 'unscannable', errorCode: 'SCAN_LIMIT_EXCEEDED', retryable: false } as const,
    ]) {
      await expect(record(response)).resolves.toEqual(snapshot);
    }
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('preserves a clean verdict for the same bytes after late failure, but infection wins', async () => {
    await record(clean);
    manager.save.mockClear();
    await expect(record(failure)).resolves.toMatchObject({ antivirusAnalysis: { status: 'clean' } });
    expect(manager.save).not.toHaveBeenCalled();
    await expect(record(infected)).resolves.toMatchObject({ antivirusAnalysis: { status: 'infected' } });
  });

  it('invalidates a changed digest instead of reusing clean', async () => {
    await record(clean);
    await expect(record({ ...clean, sha256: 'b'.repeat(64) })).resolves.toMatchObject({
      antivirusAnalysis: { status: 'error', errorCode: 'SCANNER_DIGEST_CHANGED', retryable: false },
    });
  });

  it('refuses stale processing keys without writing an analysis', async () => {
    await expect(repository.recordScan(depot.id, clean, 'staging/overwritable.xml')).rejects.toMatchObject({
      code: 'ANTIVIRUS_OBJECT_MISMATCH',
      retryable: false,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('invalidates a prior clean analysis bound to a different processing key', async () => {
    await record(clean);
    depot.path = 'processing/replacement.xml';
    await expect(repository.recordScan(depot.id, clean, depot.path)).resolves.toMatchObject({
      antivirusAnalysis: { status: 'error', errorCode: 'SCANNER_OBJECT_CHANGED' },
    });
  });

  it('returns null for missing depots and rejects incomplete success before a transaction', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(record(clean)).resolves.toBeNull();
    expect(manager.save).not.toHaveBeenCalled();
    dataSource.transaction.mockClear();
    await expect(record({ verdict: 'clean' } as AntivirusScanResponse)).rejects.toThrow();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  const job = { depotId: 'dep_test', filePath: path, utilisateur: { id: 'u1', nom: 'N', prenom: 'P' } };

  it('persists clean and sends process_file through the same database transaction', async () => {
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.PENDING;
    await expect(repository.completeScan(job, clean)).resolves.toMatchObject({
      antivirusAnalysis: { status: 'clean' },
    });
    expect(queue.send).toHaveBeenCalledWith(QueueName.process_file, job, {
      db: { executeSql: expect.any(Function) as unknown },
    });
    const db = queue.send.mock.calls[0][2]!.db!;
    manager.query.mockResolvedValue([{ id: 'job-id' }]);
    await expect(db.executeSql('SELECT $1', ['value'])).resolves.toEqual({ rows: [{ id: 'job-id' }] });
    expect(manager.query).toHaveBeenCalledWith('SELECT $1', ['value']);
  });

  it('fails the transaction on a null or rejected enqueue', async () => {
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.PENDING;
    queue.send.mockResolvedValueOnce(null);
    await expect(repository.completeScan(job, clean)).rejects.toThrow('Failed to enqueue');
    queue.send.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(repository.completeScan(job, clean)).rejects.toThrow('queue unavailable');
  });

  it('never dispatches nonclean, stale, terminal or already advanced deposits', async () => {
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.PENDING;
    await repository.completeScan(job, infected);
    await repository.completeScan(job, clean);
    await repository.completeScan({ ...job, filePath: 'stale' }, clean);
    depot.status = DepotStatus.REJETE;
    await repository.completeScan(job, clean);
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.CONTROLE_IN_PROGRESS;
    await repository.completeScan(job, clean);
    expect(queue.send).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['infected', infected],
    ['error', failure],
    ['unscannable', { verdict: 'unscannable', errorCode: 'SCAN_LIMIT_EXCEEDED', retryable: false } as const],
  ])('never creates process_file for a %s verdict', async (_name, result) => {
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.PENDING;
    await repository.completeScan(job, result);
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('does not publish a second processing job for a duplicate clean scan or retry', async () => {
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.PENDING;
    await repository.completeScan(job, clean);
    await repository.completeScan(job, clean);
    await repository.completeScan(job);
    expect(queue.send).toHaveBeenCalledTimes(1);
  });

  it('rolls back a scan and enqueue when its lease is cancelled during publication', async () => {
    depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
    depot.step = DepotStep.PENDING;
    const controller = new AbortController();
    queue.send.mockImplementation(() => {
      controller.abort();
      return Promise.resolve('job-id');
    });
    await expect(repository.completeScan(job, clean, controller.signal)).rejects.toThrow();
    expect(analysis).toBeNull();
  });
});
