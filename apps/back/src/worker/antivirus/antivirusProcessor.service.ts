import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AntivirusStatus, DepotStatus, DepotStep, isAntivirusAccepted } from '@lib/dossier';
import { DepotService } from '@dossier/depot/depot.service';
import type { DepotModel } from '@dossier/depot/depot.model';
import { DepotAntivirusGateway, type AntivirusCompletionResult } from '@dossier/depot/depotAntivirus.gateway';
import { DepotUploadGateway } from '@dossier/depot/depotUpload.gateway';
import { DepotError } from '@dossier/depot/depotError';
import type { FichierDeDepot } from '@dossier/depot/file/file';
import { S3 } from '@infra/s3/s3';
import { AntivirusGateway } from '@infra/antivirus/antivirus.gateway';
import { AntivirusScanError } from '@infra/antivirus/antivirus.errors';
import { isAntivirusBypassed } from '@infra/antivirus/antivirus.config';
import type { AsyncTask } from '@worker/asyncTask';
import { FileProcessingError, type FileProcessingAttempt } from '@worker/fileProcessingAttempt';

@Injectable()
export class AntivirusProcessorService implements AsyncTask<FichierDeDepot> {
  constructor(
    private readonly depotService: DepotService,
    @Inject(S3) private readonly s3: S3,
    @Inject(AntivirusGateway) private readonly antivirus: AntivirusGateway,
    @Inject(DepotAntivirusGateway) private readonly evidence: DepotAntivirusGateway,
    @Inject(DepotUploadGateway) private readonly lifecycle: DepotUploadGateway,
    private readonly config: ConfigService,
  ) {}

  async process(job: FichierDeDepot, attempt: FileProcessingAttempt = {}): Promise<void> {
    const { depotId, filePath } = job;
    const { retryCount = 0, retryLimit = 0, signal } = attempt;
    const canRetry = retryCount < retryLimit;
    try {
      signal?.throwIfAborted();
      const depot = await this.depotService.findById(depotId);
      signal?.throwIfAborted();
      if (!this.isPending(depot, filePath)) {
        return;
      }
      if (depot.antivirusAnalysis?.status === AntivirusStatus.INFECTED) {
        await this.reject(job, DepotError.ANTIVIRUS_INFECTED);
        return;
      }
      const bypassed = isAntivirusBypassed(this.config);
      if (
        !bypassed &&
        depot.antivirusAnalysis?.status === AntivirusStatus.ERROR &&
        depot.antivirusAnalysis.retryable === false
      ) {
        await this.reject(job, DepotError.ANTIVIRUS_TECHNICAL_FAILURE);
        return;
      }
      let response: AntivirusCompletionResult | undefined;
      if (bypassed) {
        response = { verdict: 'ignored' };
      } else if (!isAntivirusAccepted(depot.antivirusAnalysis?.status)) {
        const { stream, size } = await this.s3.downloadStream(filePath, signal);
        try {
          signal?.throwIfAborted();
          response = await this.antivirus.scanStream(stream, size, signal);
        } catch (error) {
          if (!(error instanceof AntivirusScanError)) {
            throw error;
          }
          signal?.throwIfAborted();
          const saved = await this.evidence.recordScan(depotId, error.failure, filePath);
          signal?.throwIfAborted();
          if (!saved) {
            return;
          }
          if (saved.antivirusAnalysis?.status === AntivirusStatus.INFECTED) {
            await this.reject(job, DepotError.ANTIVIRUS_INFECTED);
            return;
          }
          if (!isAntivirusAccepted(saved.antivirusAnalysis?.status)) {
            if (error.retryable && canRetry) {
              throw error;
            }
            await this.reject(
              job,
              error.retryable ? DepotError.ANTIVIRUS_RETRY_EXHAUSTED : DepotError.ANTIVIRUS_TECHNICAL_FAILURE,
            );
            return;
          }
          // A concurrent accepted state wins over a late transient failure.
        } finally {
          stream.destroy();
        }
      }
      signal?.throwIfAborted();
      // The verdict and process_file publication commit together under the depot row lock.
      const saved = await this.evidence.completeScan(job, response, signal);
      if (!saved) {
        return;
      }
      if (saved.antivirusAnalysis?.status === AntivirusStatus.INFECTED) {
        await this.reject(job, DepotError.ANTIVIRUS_INFECTED);
        return;
      }
      if (!isAntivirusAccepted(saved.antivirusAnalysis?.status)) {
        throw new FileProcessingError('ANTIVIRUS_CLEAN_NOT_PERSISTED');
      }
    } catch (error: unknown) {
      if (attempt.signal?.aborted) {
        throw new FileProcessingError('ANTIVIRUS_CANCELLED');
      }
      const conflict = typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === false;
      if (conflict || !canRetry) {
        await this.reject(job, DepotError.ANTIVIRUS_TECHNICAL_FAILURE);
        return;
      }
      throw new FileProcessingError(error instanceof AntivirusScanError ? error.code : 'ANTIVIRUS_RETRY');
    }
  }

  /** Final crash/lease-expiration cleanup must not reject an already handed-off file. */
  async exhausted(job: FichierDeDepot): Promise<void> {
    try {
      const depot = await this.depotService.findById(job.depotId);
      if (!this.isPending(depot, job.filePath) || isAntivirusAccepted(depot.antivirusAnalysis?.status)) {
        return;
      }
      if (depot.antivirusAnalysis?.status === AntivirusStatus.INFECTED) {
        await this.reject(job, DepotError.ANTIVIRUS_INFECTED);
        return;
      }
      const saved = await this.evidence.recordScan(
        job.depotId,
        {
          verdict: 'error',
          errorCode: 'SCANNER_JOB_EXHAUSTED',
          retryable: false,
        },
        job.filePath,
      );
      if (!saved || isAntivirusAccepted(saved.antivirusAnalysis?.status)) {
        return;
      }
      await this.reject(
        job,
        saved.antivirusAnalysis?.status === AntivirusStatus.INFECTED
          ? DepotError.ANTIVIRUS_INFECTED
          : DepotError.ANTIVIRUS_RETRY_EXHAUSTED,
      );
    } catch {
      throw new FileProcessingError('ANTIVIRUS_FINALIZATION_FAILED');
    }
  }

  private isPending(depot: DepotModel, path: string): boolean {
    return (
      depot.path === path && depot.status === DepotStatus.EN_COURS_DE_TRAITEMENT && depot.step === DepotStep.PENDING
    );
  }

  private async reject(job: FichierDeDepot, error: DepotError): Promise<void> {
    try {
      await this.lifecycle.transaction(async (transaction) => {
        const depot = await transaction.findForUpdate(job.depotId);
        if (!depot || !this.isPending(depot, job.filePath)) {
          return;
        }
        // A late failure must not reject an accepted file awaiting its processing consumer.
        if (isAntivirusAccepted(depot.antivirusAnalysis?.status)) {
          return;
        }
        depot.status = DepotStatus.REJETE;
        depot.step = DepotStep.CONTROLE_FAILED;
        depot.stepHistory = [...(depot.stepHistory ?? []), depot.step];
        depot.error = error;
        await transaction.save(depot);
      });
    } catch {
      throw new FileProcessingError('ANTIVIRUS_PERSISTENCE_FAILED');
    }
  }
}
