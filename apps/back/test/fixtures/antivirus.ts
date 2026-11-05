import { createHash } from 'node:crypto';
import { AntivirusStatus, type AntivirusScanResult } from '@lib/dossier';
import type { AntivirusAnalysisModel } from '@dossier/depot/antivirusAnalysis.model';

/** Opt in only for tests whose subject needs to consume an already-scanned XML. */
export function cleanAnalysis(depotId: string, filePath: string, buffer: Buffer): AntivirusAnalysisModel {
  return {
    depotId,
    filePath,
    status: AntivirusStatus.CLEAN,
    scannedAt: new Date('2026-11-05T10:00:00Z'),
    signatureUpdatedAt: new Date('2026-11-05T09:00:00Z'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    engineVersion: 'ClamAV 1.4.3',
    signatureVersion: '28174',
    retryable: false,
    errorCode: null,
    detection: null,
  };
}

export function cleanScan(buffer: Buffer): AntivirusScanResult {
  const analysis = cleanAnalysis('fixture', 'fixture', buffer);
  return {
    verdict: 'clean',
    retryable: false,
    sha256: analysis.sha256!,
    scannedAt: analysis.scannedAt!.toISOString(),
    engineVersion: analysis.engineVersion!,
    signatureVersion: analysis.signatureVersion!,
    signatureUpdatedAt: analysis.signatureUpdatedAt!.toISOString(),
  };
}
