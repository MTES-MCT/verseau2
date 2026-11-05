import { createServer, type Socket } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { request } from 'node:http';
import { createHash } from 'node:crypto';
import type { Config } from '../src/config.ts';
import { createScannerServer } from '../src/server.ts';

export const TOKEN = 'test-shared-token-with-at-least-32-chars';
export function version(date = new Date(), serial = '28001') {
  return `ClamAV 1.4.3/${serial}/${date.toUTCString().replace(',', '').replace(' GMT', '').replace(/^(\w+) (\d+) (\w+) (\d+) (.*)$/, '$1 $3 $2 $5 $4')}`;
}

export interface FakeOptions {
  reply?: string | null;
  version?: string | (() => string);
  fragment?: boolean;
  onScan?: (socket: Socket) => void;
  slowReadMs?: number;
  earlyReply?: string;
  ping?: string | null;
}

export async function fixture(options: FakeOptions = {}, overrides: Partial<Config> = {}) {
  // A loaded signature generation is immutable until an explicit reload.
  const defaultVersion = version();
  const directory = await mkdtemp(join(tmpdir(), 'av-'));
  const socketPath = join(directory, 'clamd.sock');
  const peers = new Set<Socket>();
  let scans = 0;
  let scanBytes = 0;
  let scanHash = '';
  let scanTerminations = 0;
  const daemon = createServer(socket => {
    peers.add(socket);
    socket.on('close', () => peers.delete(socket));
    socket.on('error', () => {});
    let buffer = Buffer.alloc(0);
    let streaming = false;
    const hash = createHash('sha256');
    const answer = (text: string) => {
      if (options.fragment) {
        const chunks = Buffer.from(text);
        const send = (i: number) => {
          if (i === chunks.length) {
            socket.end();
          } else {
            socket.write(chunks.subarray(i, i + 1));
            setImmediate(send, i + 1);
          }
        };
        send(0);
      } else {
        socket.end(text);
      }
    };
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!streaming) {
        const nul = buffer.indexOf(0);
        if (nul === -1) { return; }
        const command = buffer.subarray(0, nul).toString();
        buffer = buffer.subarray(nul + 1);
        if (command === 'zPING') { if (options.ping !== null) { answer(options.ping ?? 'PONG\0'); } return; }
        if (command === 'zVERSION') {
          answer(`${typeof options.version === 'function' ? options.version() : options.version ?? defaultVersion}\0`); return;
        }
        if (command !== 'zINSTREAM') { socket.destroy(); return; }
        streaming = true;
        scans++;
        options.onScan?.(socket);
        if (options.earlyReply) { answer(options.earlyReply); return; }
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE();
        if (buffer.length < length + 4) { break; }
        if (length === 0) {
          scanTerminations++;
          buffer = buffer.subarray(4);
          scanHash = hash.digest('hex');
          if (options.reply !== null) { answer(options.reply ?? 'stream: OK\0'); }
          return;
        }
        const body = buffer.subarray(4, length + 4);
        scanBytes += body.length;
        hash.update(body);
        buffer = buffer.subarray(length + 4);
      }
      if (options.slowReadMs) {
        socket.pause();
        setTimeout(() => socket.resume(), options.slowReadMs);
      }
    });
  });
  daemon.listen(socketPath);
  await once(daemon, 'listening');
  const config: Config = {
    token: TOKEN, host: '127.0.0.1', port: 3011, production: false,
    socketPath, scanTimeoutMs: 2000, probeTimeoutMs: 1000, signatureMaxAgeMs: 48 * 3600000, ...overrides,
  };
  const metrics: unknown[] = [];
  const scanner = createScannerServer(config, metric => metrics.push(metric));
  scanner.server.listen(0, '127.0.0.1');
  await once(scanner.server, 'listening');
  const address = scanner.server.address();
  if (!address || typeof address === 'string') { throw new Error('No address'); }
  return {
    port: address.port, config, metrics,
    stats: () => ({ scans, scanBytes, scanHash, scanTerminations, peers: peers.size }),
    close: async () => {
      scanner.abortActive();
      scanner.server.closeAllConnections();
      await new Promise<void>(resolve => scanner.server.close(() => resolve()));
      for (const socket of peers) { socket.destroy(); }
      await new Promise<void>(resolve => daemon.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    },
  };
}

export function call(port: number, body: Buffer = Buffer.from('<xml/>'), options: {
  path?: string; method?: string; token?: string; type?: string; chunked?: boolean; headers?: Record<string, string>;
} = {}): Promise<{ status: number; body: any; headers: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: options.path ?? '/scan', method: options.method ?? 'POST', headers: {
      authorization: `Bearer ${options.token ?? TOKEN}`, 'content-type': options.type ?? 'application/octet-stream',
      ...(options.chunked ? { 'transfer-encoding': 'chunked' } : { 'content-length': String(body.length) }),
      ...options.headers,
    } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(data), headers: res.headers }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
