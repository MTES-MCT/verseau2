import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Config } from './config.ts';
import { CLAMD_MAX_SCAN_TIME_MS, failureResult, ScanFailure, type EngineMetadata, type ScanResult } from './contract.ts';
import { inspectEngine, scanStream } from './clamd.ts';

function json(response: ServerResponse, status: number, body: unknown): void {
  if (response.destroyed) {
    return;
  }
  response.writeHead(status, {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Connection': 'close', 'X-Content-Type-Options': 'nosniff',
    ...(status === 503 && (body as ScanResult).errorCode === 'BUSY' ? { 'Retry-After': '1' } : {}),
  });
  response.end(JSON.stringify(body));
}

// Only fixed operational dimensions are logged: no URLs, client IDs, headers,
// body, filenames, hash, daemon messages or detection labels.
export type Metric = { event: 'scan'; verdict: ScanResult['verdict']; errorCode?: string; durationMs: number };

export function createScannerServer(config: Config, log: (metric: Metric) => void = () => {}) {
  let busy = false;
  let cooldownUntil = 0;
  let probe: Promise<EngineMetadata> | undefined;
  const expectedToken = createHash('sha256').update(`Bearer ${config.token}`).digest();
  const controllers = new Set<AbortController>();
  const ready = () => {
    if (!probe) {
      probe = inspectEngine(config.socketPath, config.signatureMaxAgeMs, AbortSignal.timeout(config.probeTimeoutMs))
        .finally(() => { probe = undefined; });
    }
    return probe;
  };

  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    // Keep a listener for the whole request lifetime, including rejected bodies.
    request.on('error', () => {});
    const token = createHash('sha256').update(request.headers.authorization ?? '').digest();
    if (!timingSafeEqual(token, expectedToken)) {
      json(response, 401, failureResult(new ScanFailure('UNAUTHORIZED', 401, false)));
      return;
    }
    if (request.method === 'GET' && request.url === '/health/live') {
      json(response, 200, { status: 'live' });
      return;
    }
    if (request.method === 'GET' && request.url === '/health/ready') {
      try {
        json(response, 200, { status: 'ready', ...await ready() });
      } catch (error) {
        if (error instanceof ScanFailure && error.errorCode === 'SCAN_TIMEOUT') {
          throw new ScanFailure('CLAMD_UNAVAILABLE');
        }
        throw error;
      }
      return;
    }
    if (request.method !== 'POST' || request.url !== '/scan') {
      throw new ScanFailure('NOT_FOUND', 404, false);
    }
    if (request.headers['content-type']?.toLowerCase() !== 'application/octet-stream' ||
        request.headers['content-encoding'] !== undefined) {
      throw new ScanFailure('UNSUPPORTED_MEDIA_TYPE', 415, false);
    }
    if (busy || performance.now() < cooldownUntil) {
      log({ event: 'scan', verdict: 'error', errorCode: 'BUSY', durationMs: 0 });
      throw new ScanFailure('BUSY');
    }
    busy = true;
    const started = performance.now();
    const controller = new AbortController();
    controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
    const disconnect = () => {
      if (!response.writableFinished) {
        controller.abort();
      }
    };
    response.once('close', disconnect);
    let metadata: EngineMetadata | undefined;
    let sha256: string | null = null;
    let result: ScanResult;
    let status = 200;
    let daemonScanning = false;
    let daemonStartedAt = 0;
    try {
      metadata = await inspectEngine(config.socketPath, config.signatureMaxAgeMs, controller.signal);
      if (request.headers.expect?.toLowerCase() === '100-continue') {
        response.writeContinue();
      }
      const verdict = await scanStream(request, config.socketPath, controller.signal, hash => { sha256 = hash; }, scanning => {
        daemonScanning = scanning;
        if (scanning) { daemonStartedAt = performance.now(); }
      });
      const after = await inspectEngine(config.socketPath, config.signatureMaxAgeMs, controller.signal);
      if (JSON.stringify(after) !== JSON.stringify(metadata)) {
        throw new ScanFailure('ENGINE_CHANGED');
      }
      if (!sha256) {
        throw new ScanFailure('CLAMD_PROTOCOL');
      }
      result = { ...verdict, ...metadata, sha256, scannedAt: new Date().toISOString(), retryable: false };
    } catch (error) {
      const failure = controller.signal.aborted ? new ScanFailure('SCAN_TIMEOUT', 504) :
        error instanceof ScanFailure ? error : new ScanFailure('INTERNAL_ERROR', 500);
      status = failure.status;
      result = failureResult(failure, metadata, sha256);
    } finally {
      clearTimeout(timer);
      controllers.delete(controller);
      response.off('close', disconnect);
      request.pause();
      if (daemonScanning) {
        // INSTREAM has no cancellation command once submitted. A disconnected
        // scan can continue in clamd: reject new scans until its bounded engine
        // budget elapses instead of silently queueing work behind it.
        cooldownUntil = daemonStartedAt + CLAMD_MAX_SCAN_TIME_MS + 1000;
      }
      busy = false;
    }
    log({ event: 'scan', verdict: result.verdict, ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      durationMs: Math.round(performance.now() - started) });
    json(response, status, result);
  };
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: config.scanTimeoutMs + 1000,
    headersTimeout: Math.min(10000, config.scanTimeoutMs + 1000), keepAliveTimeout: 1 }, (request, response) => {
    void handle(request, response).catch(error => {
      const failure = error instanceof ScanFailure ? error : new ScanFailure('INTERNAL_ERROR', 500);
      json(response, failure.status, failureResult(failure));
    });
  });
  server.on('checkContinue', (request, response) => {
    void handle(request, response).catch(error => {
      const failure = error instanceof ScanFailure ? error : new ScanFailure('INTERNAL_ERROR', 500);
      json(response, failure.status, failureResult(failure));
    });
  });
  server.maxConnections = 64;
  server.maxRequestsPerSocket = 1;
  server.on('clientError', (_error, socket) => {
    // No parser error text or raw packet logging (may contain credentials/body).
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  server.on('close', () => {
    for (const controller of controllers) {
      controller.abort();
    }
  });
  return { server, abortActive: () => { for (const controller of controllers) { controller.abort(); } } };
}
