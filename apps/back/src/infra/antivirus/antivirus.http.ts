import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import axios, { type AxiosInstance } from 'axios';
import {
  antivirusScanResponseSchema,
  antivirusScannerErrorCodeSchema,
  MAX_DEPOT_FILE_SIZE_BYTES,
  type AntivirusScanResult,
} from '@lib/dossier';
import type { AntivirusGateway } from './antivirus.gateway';
import type { AntivirusHttpConfig } from './antivirus.config';
import {
  AntivirusProtocolError,
  AntivirusScanError,
  AntivirusTransientError,
  AntivirusUnscannableError,
} from './antivirus.errors';

export class HttpAntivirusGateway implements AntivirusGateway {
  constructor(
    private readonly config: AntivirusHttpConfig,
    private readonly client: AxiosInstance = axios.create(),
  ) {}

  async scan(buffer: Buffer): Promise<AntivirusScanResult> {
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const stream = Readable.from(
      (function* () {
        // Views into the existing Buffer: no base64 encoding or second full-file copy.
        for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
          yield buffer.subarray(offset, offset + 64 * 1024);
        }
      })(),
    );
    return this.request(stream, buffer.length, () => sha256);
  }

  async scanStream(source: Readable, size: number, signal?: AbortSignal): Promise<AntivirusScanResult> {
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_DEPOT_FILE_SIZE_BYTES) {
      source.destroy();
      throw new AntivirusUnscannableError('PAYLOAD_TOO_LARGE', null);
    }
    const deadline = AbortSignal.any([AbortSignal.timeout(this.config.timeoutMs), ...(signal ? [signal] : [])]);
    const hash = createHash('sha256');
    let bytes = 0;
    let sha256: string | null = null;
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.length;
        if (bytes > size) {
          callback(new AntivirusProtocolError('SCANNER_LENGTH_MISMATCH', null));
          return;
        }
        hash.update(chunk);
        callback(null, chunk);
      },
      flush(callback) {
        if (bytes !== size) {
          callback(new AntivirusProtocolError('SCANNER_LENGTH_MISMATCH', null));
          return;
        }
        sha256 = hash.digest('hex');
        callback();
      },
    });
    const upload = pipeline(source, meter, { signal: deadline });
    // An upstream error can precede the HTTP response. Observe it immediately.
    void upload.catch(() => {});
    try {
      return await this.request(meter, size, () => sha256, deadline, upload);
    } catch (error: unknown) {
      if (meter.errored instanceof AntivirusScanError) {
        throw meter.errored;
      }
      if (deadline.aborted) {
        throw new AntivirusTransientError('SCANNER_TIMEOUT', sha256);
      }
      if (error instanceof AntivirusScanError && error.code !== 'SCANNER_REQUEST_FAILED') {
        throw error;
      }
      if (source.errored) {
        throw new AntivirusTransientError('SCANNER_SOURCE_FAILED', sha256);
      }
      throw error;
    } finally {
      source.destroy();
      meter.destroy();
      await upload.catch(() => {});
    }
  }

  private async request(
    stream: Readable,
    size: number,
    digest: () => string | null,
    signal = AbortSignal.timeout(this.config.timeoutMs),
    upload?: Promise<void>,
  ): Promise<AntivirusScanResult> {
    try {
      const response = await this.client.post<unknown>(this.config.url, stream, {
        adapter: 'http',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(size),
          Accept: 'application/json',
        },
        timeout: this.config.timeoutMs,
        signal,
        maxRedirects: 0,
        proxy: false,
        maxBodyLength: Infinity,
        maxContentLength: 16 * 1024,
        responseType: 'json',
        validateStatus: () => true,
      });
      // A successful verdict must cover the complete upload, not an early HTTP response.
      if (response.status === 200 && upload) {
        await upload;
      }
      const sha256 = digest();
      const { status } = response;
      const parsed = antivirusScanResponseSchema.safeParse(response.data);
      if (parsed.success && parsed.data.sha256 != null && parsed.data.sha256 !== sha256) {
        throw new AntivirusProtocolError('SCANNER_DIGEST_MISMATCH', sha256);
      }
      const remoteFailure =
        parsed.success && (parsed.data.verdict === 'error' || parsed.data.verdict === 'unscannable')
          ? { ...parsed.data, sha256 }
          : undefined;
      if (remoteFailure && !antivirusScannerErrorCodeSchema.safeParse(remoteFailure.errorCode).success) {
        throw new AntivirusProtocolError('SCANNER_INVALID_RESPONSE', sha256);
      }
      if (
        remoteFailure?.retryable &&
        !['BUSY', 'CLAMD_UNAVAILABLE', 'STALE_SIGNATURES', 'ENGINE_CHANGED', 'SCAN_TIMEOUT'].includes(
          remoteFailure.errorCode,
        )
      ) {
        // Only explicitly transient conditions may consume the caller's bounded retry budget.
        throw new AntivirusProtocolError(remoteFailure.errorCode, sha256, { ...remoteFailure, retryable: false });
      }
      if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 408) {
        if (remoteFailure && !remoteFailure.retryable) {
          throw new AntivirusProtocolError(remoteFailure.errorCode, sha256, remoteFailure);
        }
        const code = status === 429 || status === 503 ? 'SCANNER_BUSY_OR_UNAVAILABLE' : 'SCANNER_UNAVAILABLE';
        throw new AntivirusTransientError(
          remoteFailure?.errorCode ?? (status === 504 || status === 408 ? 'SCANNER_TIMEOUT' : code),
          sha256,
          remoteFailure,
        );
      }
      if (status === 413) {
        const failure = remoteFailure
          ? { ...remoteFailure, verdict: 'unscannable' as const, retryable: false as const }
          : undefined;
        throw new AntivirusUnscannableError(remoteFailure?.errorCode ?? `SCANNER_HTTP_${status}`, sha256, failure);
      }
      if (status !== 200) {
        const failure = remoteFailure ? { ...remoteFailure, retryable: false as const } : undefined;
        throw new AntivirusProtocolError(remoteFailure?.errorCode ?? `SCANNER_HTTP_${status}`, sha256, failure);
      }
      if (!parsed.success || !/^application\/json(?:\s*;|$)/i.test(String(response.headers['content-type'] ?? ''))) {
        throw new AntivirusProtocolError('SCANNER_INVALID_RESPONSE', sha256);
      }
      const result = parsed.data;
      if (result.verdict === 'unscannable') {
        if (!['SCAN_LIMIT_EXCEEDED', 'ENCRYPTED_CONTENT'].includes(result.errorCode)) {
          throw new AntivirusProtocolError('SCANNER_INVALID_RESPONSE', sha256);
        }
        throw new AntivirusUnscannableError(result.errorCode, sha256, { ...result, sha256 });
      }
      if (result.verdict === 'error') {
        // Contract errors use non-2xx. An error disguised as HTTP 200 is a protocol failure.
        throw new AntivirusProtocolError('SCANNER_UNEXPECTED_ERROR_STATUS', sha256);
      }
      if (result.verdict === 'infected' && result.detection?.startsWith('Heuristics.Limits.Exceeded')) {
        throw new AntivirusUnscannableError('SCAN_LIMIT_EXCEEDED', sha256, {
          ...result,
          verdict: 'unscannable',
          errorCode: 'SCAN_LIMIT_EXCEEDED',
          retryable: false,
        });
      }
      return result;
    } catch (error: unknown) {
      if (error instanceof AntivirusScanError) {
        throw error;
      }
      const sha256 = digest();
      if (axios.isAxiosError(error)) {
        if (['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code ?? '')) {
          throw new AntivirusTransientError('SCANNER_TIMEOUT', sha256);
        }
        if (
          ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH', 'EHOSTUNREACH'].includes(
            error.code ?? '',
          )
        ) {
          throw new AntivirusTransientError('SCANNER_UNAVAILABLE', sha256);
        }
      }
      throw new AntivirusProtocolError('SCANNER_REQUEST_FAILED', sha256);
    } finally {
      stream.destroy();
    }
  }
}
