import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  AntivirusStatus,
  DepotStatus,
  DepotStep,
  antivirusScanResponseSchema,
  isAntivirusAccepted,
  type AntivirusScanResponse,
} from '@lib/dossier';
import { QueueGateway, QueueName, type Queue } from '@queue/queue';
import { DepotEntity } from './depot.entity';
import {
  DepotAntivirusConflictError,
  DepotAntivirusGateway,
  type AntivirusCompletionResult,
} from './depotAntivirus.gateway';
import { mapDepotEntityToModel } from './depot.mapper';
import type { DepotModel } from './depot.model';
import { AntivirusAnalysisEntity } from './antivirusAnalysis.entity';
import type { FichierDeDepot } from './file/file';

@Injectable()
export class DepotAntivirusRepository implements DepotAntivirusGateway {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(QueueGateway) private readonly queue: Queue,
  ) {}

  async recordScan(
    depotId: string,
    response: AntivirusScanResponse,
    expectedFilePath: string,
  ): Promise<DepotModel | null> {
    // Also validate mocked/custom adapters: a partial success must never grant access.
    const parsedResult = antivirusScanResponseSchema.parse(response);
    return this.dataSource.transaction((manager) => this.persist(manager, depotId, parsedResult, expectedFilePath));
  }

  async completeScan(
    job: FichierDeDepot,
    result?: AntivirusCompletionResult,
    signal?: AbortSignal,
  ): Promise<DepotModel | null> {
    let parsed: AntivirusCompletionResult | undefined;
    if (result?.verdict === 'ignored') {
      parsed = result;
    } else if (result) {
      parsed = antivirusScanResponseSchema.parse(result);
    }
    return this.dataSource.transaction(async (manager) => {
      signal?.throwIfAborted();
      const entity = await manager.findOne(DepotEntity, {
        where: { id: job.depotId },
        lock: { mode: 'pessimistic_write' },
      });
      signal?.throwIfAborted();
      if (
        !entity ||
        entity.path !== job.filePath ||
        entity.status !== DepotStatus.EN_COURS_DE_TRAITEMENT ||
        entity.step !== DepotStep.PENDING
      ) {
        return null;
      }
      entity.antivirusAnalysis = await manager.findOne(AntivirusAnalysisEntity, { where: { depotId: job.depotId } });
      // A committed accepted state from this queue already committed its process_file job.
      const alreadyAccepted = isAntivirusAccepted(entity.antivirusAnalysis?.status);
      const depot = parsed
        ? await this.persist(manager, job.depotId, parsed, job.filePath)
        : mapDepotEntityToModel(entity);
      signal?.throwIfAborted();
      if (isAntivirusAccepted(depot?.antivirusAnalysis?.status) && !alreadyAccepted) {
        const id = await this.queue.send(QueueName.process_file, job, {
          db: { executeSql: async (sql, values) => ({ rows: await manager.query<object[]>(sql, values) }) },
        });
        if (!id) {
          throw new Error('Failed to enqueue process_file');
        }
      }
      signal?.throwIfAborted();
      return depot;
    });
  }

  private async persist(
    manager: EntityManager,
    depotId: string,
    result: AntivirusCompletionResult,
    expectedFilePath: string,
  ): Promise<DepotModel | null> {
    const entity = await manager.findOne(DepotEntity, {
      where: { id: depotId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!entity) {
      return null;
    }
    // Lock the parent first, even when no analysis exists yet. This serializes lazy creation.
    const analysis =
      (await manager.findOne(AntivirusAnalysisEntity, { where: { depotId } })) ??
      Object.assign(new AntivirusAnalysisEntity(), { depotId, status: AntivirusStatus.PENDING });
    entity.antivirusAnalysis = analysis;
    // Infection is terminal. Late successes/errors must not erase its evidence.
    if (analysis.status === AntivirusStatus.INFECTED) {
      return mapDepotEntityToModel(entity);
    }
    if (!expectedFilePath || entity.path !== expectedFilePath) {
      // A stale job must not publish a verdict for a different processing key.
      throw new DepotAntivirusConflictError();
    }
    if (analysis.status === AntivirusStatus.IGNORED && result.verdict !== 'infected') {
      return mapDepotEntityToModel(entity);
    }
    if (result.verdict === 'ignored') {
      if (analysis.status === AntivirusStatus.CLEAN) {
        return mapDepotEntityToModel(entity);
      }
      Object.assign(analysis, {
        filePath: expectedFilePath,
        status: AntivirusStatus.IGNORED,
        scannedAt: null,
        sha256: null,
        engineVersion: null,
        signatureVersion: null,
        signatureUpdatedAt: null,
        detection: null,
        errorCode: null,
        retryable: false,
      });
      await manager.save(analysis);
      return mapDepotEntityToModel(entity);
    }
    const digestChanged =
      analysis.status === AntivirusStatus.CLEAN && result.sha256 != null && analysis.sha256 !== result.sha256;
    const keyChanged = analysis.status === AntivirusStatus.CLEAN && analysis.filePath !== expectedFilePath;
    if ((digestChanged || keyChanged) && result.verdict !== 'infected') {
      // An immutable processing object changing is a security failure, not an idempotent retry.
      result = {
        verdict: 'error',
        errorCode: keyChanged ? 'SCANNER_OBJECT_CHANGED' : 'SCANNER_DIGEST_CHANGED',
        retryable: false,
        sha256: result.sha256,
      };
    }
    if (analysis.status === AntivirusStatus.CLEAN && !digestChanged && !keyChanged && result.verdict !== 'infected') {
      // A retry after downstream failure does not undo the already committed scan.
      return mapDepotEntityToModel(entity);
    }
    const success = result.verdict === 'clean' || result.verdict === 'infected';
    analysis.filePath = expectedFilePath;
    analysis.status = AntivirusStatus.ERROR;
    if (result.verdict === 'clean') {
      analysis.status = AntivirusStatus.CLEAN;
    } else if (result.verdict === 'infected') {
      analysis.status = AntivirusStatus.INFECTED;
    }
    analysis.scannedAt = result.scannedAt ? new Date(result.scannedAt) : null;
    analysis.sha256 = result.sha256 ?? null;
    analysis.engineVersion = result.engineVersion ?? null;
    analysis.signatureVersion = result.signatureVersion ?? null;
    analysis.signatureUpdatedAt = result.signatureUpdatedAt ? new Date(result.signatureUpdatedAt) : null;
    analysis.detection = result.verdict === 'infected' ? (result.detection ?? null) : null;
    analysis.errorCode = success ? null : (result.errorCode ?? null);
    analysis.retryable = result.retryable;
    await manager.save(analysis);
    return mapDepotEntityToModel(entity);
  }
}
