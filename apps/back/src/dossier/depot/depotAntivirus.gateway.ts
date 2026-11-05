import type { AntivirusScanResponse } from '@lib/dossier';
import type { DepotModel } from './depot.model';
import type { FichierDeDepot } from './file/file';

export interface DepotAntivirusGateway {
  /** Atomic, monotonic verdict persistence. Always inspect the returned persisted state. */
  recordScan(depotId: string, result: AntivirusScanResponse, expectedFilePath: string): Promise<DepotModel | null>;
  /** Persist a verdict and enqueue processing in one transaction. Omit result to reuse saved clean evidence. */
  completeScan(job: FichierDeDepot, result?: AntivirusScanResponse, signal?: AbortSignal): Promise<DepotModel | null>;
}

export const DepotAntivirusGateway = Symbol('DepotAntivirusGateway');

export class DepotAntivirusConflictError extends Error {
  readonly code = 'ANTIVIRUS_OBJECT_MISMATCH';
  readonly retryable = false;

  constructor() {
    super('Antivirus result does not describe the current processing object');
  }
}
