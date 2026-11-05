import { createConnection, type Socket } from 'node:net';
import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { MAX_BYTES, ScanFailure, type EngineMetadata } from './contract.ts';

// One command per socket, z-prefixed NUL framing. A response is not complete
// until EOF: reject trailing bytes/multiple frames rather than accepting a prefix.
class Exchange {
  readonly socket: Socket;
  readonly result: Promise<string>;
  private readonly connected: Promise<void>;
  private readonly abort: () => void;
  private readonly signal: AbortSignal;

  constructor(path: string, signal: AbortSignal) {
    this.signal = signal;
    this.socket = createConnection({ path });
    this.connected = new Promise((resolve, reject) => {
      this.socket.once('connect', resolve);
      this.socket.once('error', reject);
    });
    // A failed connect can happen before the caller starts writing.
    void this.connected.catch(() => {});
    this.abort = () => this.socket.destroy(new ScanFailure('SCAN_TIMEOUT', 504));
    this.result = new Promise((resolve, reject) => {
      let response = Buffer.alloc(0);
      let ended = false;
      this.socket.on('data', (chunk: Buffer) => {
        if (response.length + chunk.length > 4096) {
          this.socket.destroy(new ScanFailure('CLAMD_PROTOCOL'));
          return;
        }
        response = Buffer.concat([response, chunk]);
      });
      this.socket.once('end', () => {
        ended = true;
        if (response.length < 2 || response.at(-1) !== 0 ||
            response.subarray(0, -1).includes(0) ||
            /[^\x20-\x7e]/.test(response.subarray(0, -1).toString('latin1'))) {
          reject(new ScanFailure('CLAMD_PROTOCOL'));
          return;
        }
        resolve(response.subarray(0, -1).toString('ascii'));
      });
      this.socket.once('error', error => reject(error instanceof ScanFailure ? error : new ScanFailure('CLAMD_UNAVAILABLE')));
      this.socket.once('close', () => {
        this.signal.removeEventListener('abort', this.abort);
        if (!ended) {
          reject(new ScanFailure('CLAMD_UNAVAILABLE'));
        }
      });
    });
    void this.result.catch(() => {});
    signal.addEventListener('abort', this.abort, { once: true });
    if (signal.aborted) {
      this.abort();
    }
  }

  async write(data: Buffer, onSubmitted?: () => void): Promise<void> {
    await this.connected;
    if (this.socket.destroyed || this.signal.aborted) {
      throw new ScanFailure(this.signal.aborted ? 'SCAN_TIMEOUT' : 'CLAMD_UNAVAILABLE', this.signal.aborted ? 504 : 503);
    }
    // Waiting for the write callback is stronger than merely waiting for drain:
    // no next HTTP chunk is read until these bytes have left Node's write buffer.
    await new Promise<void>((resolve, reject) => {
      this.socket.write(data, error => error ? reject(new ScanFailure('CLAMD_UNAVAILABLE')) : resolve());
      onSubmitted?.();
    });
  }

  destroy(): void {
    this.signal.removeEventListener('abort', this.abort);
    this.socket.destroy();
  }
}

export async function command(path: string, value: 'PING' | 'VERSION', signal: AbortSignal): Promise<string> {
  const exchange = new Exchange(path, signal);
  try {
    await exchange.write(Buffer.from(`z${value}\0`));
    return await exchange.result;
  } finally {
    exchange.destroy();
  }
}

export function parseVersion(value: string, maxAgeMs: number, now = Date.now()): EngineMetadata {
  const match = /^ClamAV (\d+\.\d+\.\d+(?:[.-][A-Za-z0-9.-]+)?)\/(\d+)\/((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) +\d{1,2} \d{2}:\d{2}:\d{2} \d{4})$/.exec(value);
  if (!match) {
    throw new ScanFailure('CLAMD_PROTOCOL');
  }
  // Build hook sets TZ=UTC before the buildpack starts clamd (VERSION uses local time).
  const timestamp = Date.parse(`${match[3]} GMT`);
  const parts = match[3]!.split(/ +/);
  const canonical = `${parts[0]}, ${parts[2]!.padStart(2, '0')} ${parts[1]} ${parts[4]} ${parts[3]} GMT`;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toUTCString() !== canonical ||
      timestamp > now || now - timestamp > maxAgeMs) {
    throw new ScanFailure('STALE_SIGNATURES');
  }
  return { engineVersion: match[1]!, signatureVersion: match[2]!, signatureUpdatedAt: new Date(timestamp).toISOString() };
}

export async function inspectEngine(path: string, maxAgeMs: number, signal: AbortSignal): Promise<EngineMetadata> {
  if (await command(path, 'PING', signal) !== 'PONG') {
    throw new ScanFailure('CLAMD_PROTOCOL');
  }
  return parseVersion(await command(path, 'VERSION', signal), maxAgeMs);
}

export function parseVerdict(response: string): { verdict: 'clean' | 'infected'; detection?: string } {
  if (response === 'stream: OK') {
    return { verdict: 'clean' };
  }
  const found = /^stream: ([A-Za-z0-9_.:-]{1,240}) FOUND$/.exec(response);
  if (found) {
    const detection = found[1]!;
    if (/^Heuristics\.Limits\.Exceeded(?:[.:]|$)/.test(detection)) {
      throw new ScanFailure('SCAN_LIMIT_EXCEEDED', 200, false, 'unscannable');
    }
    if (/^Heuristics\.Encrypted(?:[.:]|$)/.test(detection)) {
      throw new ScanFailure('ENCRYPTED_CONTENT', 200, false, 'unscannable');
    }
    return { verdict: 'infected', detection };
  }
  if (/^(?:INSTREAM size limit exceeded\.|stream: .*?(?:limit exceeded|timed out|Time limit).*?)(?: ERROR)?$/i.test(response)) {
    throw new ScanFailure('SCAN_LIMIT_EXCEEDED', 200, false, 'unscannable');
  }
  if (/ ERROR$/.test(response)) {
    throw new ScanFailure('CLAMD_UNAVAILABLE');
  }
  throw new ScanFailure('CLAMD_PROTOCOL');
}

export async function scanStream(
  request: IncomingMessage,
  path: string,
  signal: AbortSignal,
  onComplete: (hash: string) => void,
  onDaemonState: (scanning: boolean) => void = () => {},
): Promise<{ verdict: 'clean' | 'infected'; detection?: string }> {
  const exchange = new Exchange(path, signal);
  const hash = createHash('sha256');
  let bytes = 0;
  let uploadComplete = false;
  let cleanup = () => {};
  try {
    await exchange.write(Buffer.from('zINSTREAM\0'));
    const upload = new Promise<void>((resolve, reject) => {
      let pendingWrite = Promise.resolve();
      let stopped = false;
      const fail = (error: unknown) => {
        if (stopped) { return; }
        // Rejecting a promise alone does not stop same-turn end events or
        // queued write continuations. Make rejection terminal synchronously.
        cleanup();
        exchange.destroy();
        reject(error);
      };
      const abort = () => fail(new ScanFailure('SCAN_TIMEOUT', 504));
      const truncated = () => fail(new ScanFailure('TRUNCATED_REQUEST', 400, false));
      const data = (chunk: Buffer) => {
        if (stopped) { return; }
        request.pause();
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          fail(new ScanFailure('PAYLOAD_TOO_LARGE', 413, false, 'unscannable'));
          return;
        }
        hash.update(chunk);
        const prefix = Buffer.alloc(4);
        prefix.writeUInt32BE(chunk.length);
        pendingWrite = (async () => {
          await exchange.write(prefix);
          await exchange.write(chunk);
          if (!stopped && !signal.aborted && !exchange.socket.destroyed) {
            request.resume();
          }
        })();
        void pendingWrite.catch(fail);
      };
      const end = () => {
        if (stopped) { return; }
        if (!request.complete) {
          truncated();
          return;
        }
        // IncomingMessage may emit end while the final chunk's write is still
        // pending. Serialize the zero terminator AFTER that complete frame.
        void pendingWrite.then(async () => {
          if (stopped) { return; }
          const digest = hash.digest('hex');
          await exchange.write(Buffer.alloc(4), () => {
            // Only submitted end markers can start a scan/cooldown. A failed
            // or aborted write never certifies even a fully received body.
            uploadComplete = true;
            onComplete(digest);
            onDaemonState(true);
          });
        }).then(() => {
          if (!stopped) {
            cleanup();
            resolve();
          }
        }, fail);
      };
      cleanup = () => {
        stopped = true;
        request.pause();
        request.off('data', data);
        request.off('end', end);
        request.off('aborted', truncated);
        request.off('error', truncated);
        signal.removeEventListener('abort', abort);
      };
      request.on('data', data);
      request.once('end', end);
      request.once('aborted', truncated);
      request.once('error', truncated);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) {
        abort();
      } else if (request.destroyed) {
        truncated();
      } else {
        request.resume();
      }
    });
    // A daemon disconnect/early answer must also interrupt a slow or paused upload.
    const reply = exchange.result.then(value => {
      onDaemonState(false);
      if (!uploadComplete) {
        // Even an early OK cannot certify the complete HTTP body.
        parseVerdict(value);
        throw new ScanFailure('CLAMD_PROTOCOL');
      }
      return value;
    });
    const [, response] = await Promise.all([upload, reply]);
    return parseVerdict(response);
  } finally {
    cleanup();
    exchange.destroy();
  }
}
