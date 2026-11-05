/** Queue-provided retry metadata and cancellation; pg-boss owns execution timeouts. */
export interface FileProcessingAttempt {
  retryCount?: number;
  retryLimit?: number;
  signal?: AbortSignal;
}

/** Never propagate client exceptions, filenames or credentials to worker logs. */
export class FileProcessingError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
