import type { AntivirusScanResponse } from '@lib/dossier';
import type { DepotModel } from './depot.model';
import type { FichierDeDepot } from './file/file';

/** The ignored outcome is internal only; it is not a scanner HTTP verdict. */
export type AntivirusCompletionResult = AntivirusScanResponse | { verdict: 'ignored' };

export interface DepotAntivirusGateway {
  /** Atomic, monotonic verdict persistence. Always inspect the returned persisted state. */
  recordScan(depotId: string, result: AntivirusScanResponse, expectedFilePath: string): Promise<DepotModel | null>;
  /** Persist a verdict/bypass and enqueue processing atomically. Omit result to reuse saved accepted state. */
  completeScan(
    job: FichierDeDepot,
    result?: AntivirusCompletionResult,
    signal?: AbortSignal,
  ): Promise<DepotModel | null>;
}

export const DepotAntivirusGateway = Symbol('DepotAntivirusGateway');

export class DepotAntivirusConflictError extends Error {
  readonly code = 'ANTIVIRUS_OBJECT_MISMATCH';
  readonly retryable = false;

  constructor() {
    super('Antivirus result does not describe the current processing object');
  }
}
