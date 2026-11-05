import { AntivirusStatus } from '@lib/dossier';
import type { AntivirusAnalysisEntity } from './antivirusAnalysis.entity';

export type AntivirusAnalysisModel = Pick<
  AntivirusAnalysisEntity,
  | 'depotId'
  | 'filePath'
  | 'status'
  | 'scannedAt'
  | 'sha256'
  | 'engineVersion'
  | 'signatureVersion'
  | 'signatureUpdatedAt'
  | 'detection'
  | 'errorCode'
  | 'retryable'
>;

/** Missing OR unloaded relations are never evidence of a completed clean scan. */
export function normalizeAntivirusAnalysis(
  depotId: string,
  analysis?: AntivirusAnalysisModel | null,
): AntivirusAnalysisModel {
  if (analysis && analysis.depotId === depotId) {
    return {
      depotId,
      filePath: analysis.filePath,
      status: analysis.status,
      scannedAt: analysis.scannedAt,
      sha256: analysis.sha256,
      engineVersion: analysis.engineVersion,
      signatureVersion: analysis.signatureVersion,
      signatureUpdatedAt: analysis.signatureUpdatedAt,
      detection: analysis.detection,
      errorCode: analysis.errorCode,
      retryable: analysis.retryable,
    };
  }
  return {
    depotId,
    filePath: null,
    status: AntivirusStatus.PENDING,
    scannedAt: null,
    sha256: null,
    engineVersion: null,
    signatureVersion: null,
    signatureUpdatedAt: null,
    detection: null,
    errorCode: null,
    retryable: null,
  };
}
