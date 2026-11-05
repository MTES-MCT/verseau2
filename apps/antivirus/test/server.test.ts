import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { request } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fixture, call, TOKEN, version } from './helpers.ts';
import { loadConfig } from '../src/config.ts';

test('requires ANTIVIRUS_TOKEN and loads it unchanged', () => {
  assert.equal(loadConfig({ ANTIVIRUS_TOKEN: TOKEN }).token, TOKEN);
  for (const token of [undefined, '', 'short', 'x'.repeat(513), 'x'.repeat(32) + ' ']) {
    assert.throws(() => loadConfig({ ANTIVIRUS_TOKEN: token }), { message: 'Invalid ANTIVIRUS_TOKEN' });
  }
});

test('production fails closed on missing private config, unsafe override, daemon disabled, invalid limits/token', () => {
  const base = { ANTIVIRUS_TOKEN: TOKEN };
  assert.equal(loadConfig(base).port, 3011);
  assert.equal(loadConfig({ ...base, PORT: '9999' }).port, 3011);
  const prod = { ...base, NODE_ENV: 'production', ANTIVIRUS_PRIVATE_ONLY: 'true',
    SCALINGO_PRIVATE_HOSTNAME: '1.scanner.ap-test.pn-test.private-network.internal' };
  assert.equal(loadConfig(prod).host, prod.SCALINGO_PRIVATE_HOSTNAME);
  for (const env of [{ ...base, NODE_ENV: 'production' }, { ...prod, ANTIVIRUS_PRIVATE_ONLY: '' },
    { ...prod, SCALINGO_PRIVATE_HOSTNAME: '0.0.0.0' }, { ...prod, ANTIVIRUS_HOST: '0.0.0.0' },
    { ...prod, FRESHCLAM_DISABLE_DAEMON: 'true' }, { ...prod, CLAMD_DISABLE_DAEMON: 'true' },
    { ...prod, CLAMAV_DISABLE_PROCESS_TYPES: 'scanner,one-off' },
    { ...base, ANTIVIRUS_TOKEN: 'short' }, { ...base, ANTIVIRUS_PORT: '0' },
    { ...base, SCAN_TIMEOUT_MS: 'Infinity' }, { ...base, SIGNATURE_MAX_AGE_HOURS: '0' },
    { ...base, CLAMD_SOCKET_PATH: 'relative' }]) {
    assert.throws(() => loadConfig(env));
  }
});

test('all endpoints require exact bearer token before daemon/body handling', async t => {
  const f = await fixture(); t.after(f.close);
  for (const path of ['/scan', '/health/live', '/health/ready', '/unknown']) {
    const result = await call(f.port, Buffer.alloc(0), { path, method: path.startsWith('/health/') ? 'GET' : 'POST', token: 'wrong-secret' });
    assert.equal(result.status, 401);
    assert.equal(result.body.errorCode, 'UNAUTHORIZED');
    assert.equal(result.headers['cache-control'], 'no-store');
  }
  assert.equal(f.stats().scans, 0);
  assert.deepEqual((await call(f.port, Buffer.alloc(0), { path: '/health/live', method: 'GET' })).body, { status: 'live' });
  assert.equal((await call(f.port, Buffer.alloc(0), { path: '/health/ready', method: 'GET' })).body.status, 'ready');
  assert.equal((await call(f.port, Buffer.alloc(0), { type: 'multipart/form-data' })).status, 415);
  assert.equal((await call(f.port, Buffer.alloc(0), { headers: { 'content-encoding': 'gzip' } })).status, 415);
  assert.equal((await call(f.port, Buffer.alloc(0), { path: '/unknown' })).status, 404);
});

test('busy rejects without queue, deadline cleans socket and conservatively prevents daemon queue', async t => {
  const f = await fixture({ reply: null }, { scanTimeoutMs: 120 }); t.after(f.close);
  const first = call(f.port);
  while (f.stats().scans === 0) { await delay(5); }
  const busy = await call(f.port);
  assert.equal(busy.status, 503);
  assert.equal(busy.body.errorCode, 'BUSY');
  assert.equal(busy.body.retryable, true);
  assert.equal(busy.headers['retry-after'], '1');
  assert.equal((await first).status, 504);
  await delay(10);
  assert.equal(f.stats().peers, 0);
  assert.equal((await call(f.port)).body.errorCode, 'BUSY');
  assert.equal(f.stats().scans, 1);
});

test('daemon disconnect and early OK never yield clean', async t => {
  for (const options of [{ onScan: socket => socket.destroy() }, { earlyReply: 'stream: OK\0' }]) {
    const f = await fixture(options); t.after(f.close);
    const socket = createConnection({ port: f.port, host: '127.0.0.1' });
    await once(socket, 'connect');
    socket.write(`POST /scan HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${TOKEN}\r\nContent-Type: application/octet-stream\r\nContent-Length: 100\r\n\r\nx`);
    let response = '';
    socket.on('data', chunk => { response += chunk; });
    await once(socket, 'close');
    assert.match(response, /503/);
    assert.doesNotMatch(response, /"verdict":"clean"/);
  }
});

test('truncated upload/client disconnect destroys daemon and frees slot', async t => {
  const f = await fixture(); t.after(f.close);
  const socket = createConnection({ port: f.port, host: '127.0.0.1' });
  await once(socket, 'connect');
  socket.write(`POST /scan HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${TOKEN}\r\nContent-Type: application/octet-stream\r\nContent-Length: 100\r\n\r\nx`);
  while (f.stats().scans === 0) { await delay(5); }
  socket.destroy();
  await delay(30);
  assert.equal(f.stats().peers, 0);
  assert.equal((await call(f.port)).body.verdict, 'clean');
  assert.ok(f.metrics.every((m: any) => m.verdict !== 'clean' || m.durationMs >= 0));
});

test('slow upload deadline interrupts stalled request and closes clamd', async t => {
  const f = await fixture({}, { scanTimeoutMs: 100 }); t.after(f.close);
  const socket = createConnection({ port: f.port, host: '127.0.0.1' });
  await once(socket, 'connect');
  socket.write(`POST /scan HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${TOKEN}\r\nContent-Type: application/octet-stream\r\nContent-Length: 100\r\n\r\nx`);
  let response = '';
  socket.on('data', chunk => { response += chunk; });
  await once(socket, 'close');
  assert.match(response, /504/);
  await delay(10);
  assert.equal(f.stats().peers, 0);
  assert.equal((await call(f.port)).body.verdict, 'clean');
});

test('signature reload racing a scan cannot yield clean metadata for the wrong engine', async t => {
  let versions = 0;
  const date = new Date();
  const initial = version(date, '1');
  const reloaded = version(date, '2');
  const f = await fixture({ version: () => ++versions === 1 ? initial : reloaded }); t.after(f.close);
  const response = await call(f.port);
  assert.equal(response.status, 503);
  assert.equal(response.body.errorCode, 'ENGINE_CHANGED');
  assert.equal(response.body.retryable, true);
});

test('unavailable daemon and bounded shared readiness timeout fail closed', async t => {
  const f = await fixture({ ping: null }, { probeTimeoutMs: 50, scanTimeoutMs: 100 }); t.after(f.close);
  const probes = await Promise.all(Array.from({ length: 8 }, () => call(f.port, Buffer.alloc(0), { method: 'GET', path: '/health/ready' })));
  assert.ok(probes.every(response => response.status === 503 && response.body.errorCode === 'CLAMD_UNAVAILABLE'));
  assert.equal((await call(f.port)).status, 504);
  await delay(10);
  assert.equal(f.stats().peers, 0);
});

test('token, content, filename, URLs and raw daemon failures never enter logs or error responses', async t => {
  const sentinel = 'sensitive-content-original-filename.xml';
  const f = await fixture({ reply: `stream: ${sentinel} ERROR\0` }); t.after(f.close);
  const body = Buffer.from(sentinel);
  await call(f.port, body, { path: `/unknown?secret=${TOKEN}`, token: sentinel });
  const result = await call(f.port, body, { headers: { 'x-original-filename': sentinel } });
  assert.equal(result.status, 503);
  assert.equal(result.body.errorCode, 'CLAMD_UNAVAILABLE');
  const recorded = JSON.stringify({ metrics: f.metrics, response: result.body });
  assert.ok(!recorded.includes(sentinel));
  assert.ok(!recorded.includes(TOKEN));
  assert.equal(f.metrics.length, 1);
  assert.deepEqual(Object.keys(f.metrics[0] as object).sort(), ['durationMs', 'errorCode', 'event', 'verdict']);
});

test('Expect 100-continue is authenticated before accepting the body', async t => {
  const f = await fixture(); t.after(f.close);
  for (const [token, status] of [[TOKEN, 200], ['wrong', 401]] as const) {
    const outcome = await new Promise<{ status: number; continued: boolean }>((resolve, reject) => {
      let continued = false;
      const req = request({ host: '127.0.0.1', port: f.port, method: 'POST', path: '/scan', headers: {
        Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'Content-Length': 1, Expect: '100-continue',
      } }, response => {
        response.resume();
        response.on('end', () => resolve({ status: response.statusCode!, continued }));
      });
      req.on('continue', () => { continued = true; req.end('x'); });
      req.on('error', reject);
      req.flushHeaders();
    });
    assert.equal(outcome.status, status);
    assert.equal(outcome.continued, token === TOKEN);
  }
});

test('truncated Content-Length and malformed chunked HTTP never produce clean', async t => {
  const f = await fixture(); t.after(f.close);
  for (const framing of ['Content-Length: 10\r\n\r\nx', 'Transfer-Encoding: chunked\r\n\r\nZ\r\nx\r\n']) {
    const socket = createConnection({ port: f.port, host: '127.0.0.1' });
    await once(socket, 'connect');
    let response = '';
    socket.on('data', chunk => { response += chunk; });
    socket.end(`POST /scan HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${TOKEN}\r\nContent-Type: application/octet-stream\r\n${framing}`);
    await once(socket, 'close');
    assert.doesNotMatch(response, /"verdict":"clean"/);
    await delay(10);
  }
  assert.equal((await call(f.port)).body.verdict, 'clean');
});
