export const MAX_BYTES = 70 * 1024 * 1024;
export const CLAMD_MAX_SCAN_TIME_MS = 90000;

export interface EngineMetadata {
  engineVersion: string;
  signatureVersion: string;
  signatureUpdatedAt: string;
}

export interface ScanResult {
  verdict: 'clean' | 'infected' | 'unscannable' | 'error';
  scannedAt: string;
  sha256: string | null;
  engineVersion: string | null;
  signatureVersion: string | null;
  signatureUpdatedAt: string | null;
  detection?: string;
  errorCode?: string;
  retryable: boolean;
}

export class ScanFailure extends Error {
  readonly errorCode: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly verdict: 'error' | 'unscannable';

  constructor(
    errorCode: string,
    status: number = 503,
    retryable: boolean = ['BUSY', 'CLAMD_UNAVAILABLE', 'STALE_SIGNATURES', 'SCAN_TIMEOUT', 'ENGINE_CHANGED'].includes(errorCode),
    verdict: 'error' | 'unscannable' = 'error',
  ) {
    super(errorCode);
    this.errorCode = errorCode;
    this.status = status;
    this.retryable = retryable;
    this.verdict = verdict;
  }
}

export function failureResult(error: ScanFailure, metadata?: EngineMetadata, sha256: string | null = null): ScanResult {
  return {
    verdict: error.verdict,
    scannedAt: new Date().toISOString(),
    sha256,
    engineVersion: metadata?.engineVersion ?? null,
    signatureVersion: metadata?.signatureVersion ?? null,
    signatureUpdatedAt: metadata?.signatureUpdatedAt ?? null,
    errorCode: error.errorCode,
    retryable: error.retryable,
  };
}
