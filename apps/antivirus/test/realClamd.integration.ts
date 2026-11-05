import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { applyPolicy } from '../scripts/configure-clamd.mjs';
import { createScannerServer } from '../src/server.ts';
import { inspectEngine } from '../src/clamd.ts';
import { call, TOKEN } from './helpers.ts';

test('real clamd: fresh loaded signatures, clean XML, EICAR, limits and exact HTTP metadata', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'av-real-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const socketPath = process.env.CLAMD_SOCKET_PATH ?? join(directory, 'clamd.sock');
  if (!process.env.CLAMD_SOCKET_PATH) {
    const configPath = join(directory, 'clamd.conf');
    await writeFile(configPath, applyPolicy(`DatabaseDirectory ${process.env.CLAMD_DATABASE_DIRECTORY ?? '/var/lib/clamav'}\nLocalSocket ${socketPath}\nFixStaleSocket yes\nForeground yes\nUser ${process.env.CLAMD_TEST_USER ?? 'root'}\n`));
    const daemon = spawn(process.env.CLAMD_BINARY ?? 'clamd', ['--config-file', configPath], {
      stdio: 'ignore', env: { ...process.env, TZ: 'UTC' },
    });
    let startupError: unknown;
    daemon.on('error', error => { startupError = error; });
    t.after(async () => {
      if (daemon.exitCode === null && !startupError) {
        const exited = once(daemon, 'exit');
        daemon.kill('SIGTERM');
        await exited;
      }
    });
    for (let i = 0; ; i++) {
      if (startupError || daemon.exitCode !== null) {
        throw new Error('Cannot start real clamd; use pnpm test:integration:docker or configure CLAMD_SOCKET_PATH');
      }
      try {
        await inspectEngine(socketPath, 48 * 3600000, AbortSignal.timeout(2000));
        break;
      } catch {
        if (i === 90) { throw new Error('Real clamd/signatures not ready within 90s'); }
        await delay(1000);
      }
    }
  }
  const scanner = createScannerServer({ host: '127.0.0.1', port: 3011, token: TOKEN, production: false,
    socketPath, scanTimeoutMs: 120000, probeTimeoutMs: 3000, signatureMaxAgeMs: 48 * 3600000 });
  t.after(async () => {
    scanner.abortActive(); scanner.server.closeAllConnections();
    await new Promise<void>(resolve => scanner.server.close(() => resolve()));
  });
  scanner.server.listen(0, '127.0.0.1');
  await once(scanner.server, 'listening');
  const address = scanner.server.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  const ready = await call(port, Buffer.alloc(0), { method: 'GET', path: '/health/ready' });
  assert.equal(ready.status, 200, JSON.stringify(ready.body));
  const cleanXml = Buffer.from('<?xml version="1.0"?><Scenario><Message>clean fixture</Message></Scenario>');
  // Standard harmless antivirus test string, generated only in memory.
  const eicar = Buffer.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}', '$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(''));
  for (const [body, verdict] of [[cleanXml, 'clean'], [eicar, 'infected']] as const) {
    const response = await call(port, body, { chunked: true });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.verdict, verdict);
    assert.equal(response.body.sha256, createHash('sha256').update(body).digest('hex'));
    assert.ok(response.body.engineVersion);
    assert.match(response.body.signatureVersion, /^\d+$/);
    assert.ok(Date.parse(response.body.signatureUpdatedAt));
    assert.equal(response.body.retryable, false);
    if (verdict === 'infected') { assert.match(response.body.detection, /Eicar/i); }
    else { assert.equal(response.body.detection, undefined); assert.equal(response.body.errorCode, undefined); }
  }
  // Small nested gzip fixture exceeds recursion without an expansion bomb.
  let nested: Buffer = Buffer.from('<clean/>');
  for (let i = 0; i < 20; i++) { nested = gzipSync(nested); }
  const limited = await call(port, nested);
  assert.equal(limited.status, 200, JSON.stringify(limited.body));
  assert.equal(limited.body.verdict, 'unscannable', JSON.stringify(limited.body));
  assert.equal(limited.body.errorCode, 'SCAN_LIMIT_EXCEEDED');
  assert.equal(limited.body.retryable, false);
  const oversized = await call(port, Buffer.alloc(70 * 1024 * 1024 + 1), { chunked: true });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.verdict, 'unscannable');
  assert.equal(oversized.body.sha256, null);
  const followup = await call(port, cleanXml);
  assert.equal(followup.status, 200, JSON.stringify(followup.body));
  assert.equal(followup.body.verdict, 'clean');
});
