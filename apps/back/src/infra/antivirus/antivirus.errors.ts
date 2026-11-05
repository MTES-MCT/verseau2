import type { AntivirusScanFailure } from '@lib/dossier';

export class AntivirusScanError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly failure: AntivirusScanFailure,
  ) {
    // Do not attach HTTP errors: their config contains the bearer token and file stream.
    super(`Antivirus scan failed: ${code}`);
    this.name = new.target.name;
  }
}

export class AntivirusTransientError extends AntivirusScanError {
  constructor(code: string, sha256: string | null, failure?: AntivirusScanFailure) {
    super(code, true, failure ?? { verdict: 'error', errorCode: code, retryable: true, sha256 });
  }
}

export class AntivirusUnscannableError extends AntivirusScanError {
  constructor(code: string, sha256: string | null, failure?: AntivirusScanFailure) {
    super(code, false, failure ?? { verdict: 'unscannable', errorCode: code, retryable: false, sha256 });
  }
}

export class AntivirusProtocolError extends AntivirusScanError {
  constructor(code: string, sha256: string | null, failure?: AntivirusScanFailure) {
    super(code, false, failure ?? { verdict: 'error', errorCode: code, retryable: false, sha256 });
  }
}
