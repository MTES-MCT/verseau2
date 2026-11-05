import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { setImmediate as immediate } from 'node:timers/promises';
import { command, parseVerdict, parseVersion, scanStream } from '../src/clamd.ts';
import { MAX_BYTES } from '../src/contract.ts';
import { fixture, call, version } from './helpers.ts';

test('fresh, missing, invalid, stale and future signature metadata', () => {
  const now = Date.now();
  const parsed = parseVersion(version(new Date(now)), 3600000, now);
  assert.equal(parsed.engineVersion, '1.4.3');
  assert.equal(parsed.signatureVersion, '28001');
  for (const value of ['', 'ClamAV 1.4.3', 'ClamAV 1.4.3/1/not-a-date',
    version(new Date(now - 7200000)), version(new Date(now + 2000)),
    'ClamAV 1.4.3/1/Tue Feb 31 10:00:00 2026']) {
    assert.throws(() => parseVersion(value, 3600000, now));
  }
});

test('limits and encryption are unscannable, not malware or clean', () => {
  for (const value of ['stream: Heuristics.Limits.Exceeded.MaxScanSize FOUND',
    'stream: Heuristics.Limits.Exceeded.MaxRecursion FOUND', 'INSTREAM size limit exceeded. ERROR',
    'stream: Heuristics.Encrypted.Zip FOUND']) {
    assert.throws(() => parseVerdict(value), (error: any) => error.verdict === 'unscannable' && !error.retryable);
  }
  assert.deepEqual(parseVerdict('stream: Win.Test.EICAR_HDB-1 FOUND'), { verdict: 'infected', detection: 'Win.Test.EICAR_HDB-1' });
  for (const value of ['OK', 'stream: OK extra', 'stream: OK\0stream: Evil FOUND', 'stream: ??? FOUND', 'stream: broken ERROR']) {
    assert.throws(() => parseVerdict(value));
  }
});

test('fragmented complete replies and INSTREAM framing preserve exact body/hash', async t => {
  const f = await fixture({ fragment: true, slowReadMs: 1 });
  t.after(f.close);
  const body = Buffer.alloc(2 * 1024 * 1024 + 17, 65);
  const response = await call(f.port, body, { chunked: true });
  assert.equal(response.status, 200);
  assert.equal(response.body.verdict, 'clean');
  assert.equal(response.body.sha256, createHash('sha256').update(body).digest('hex'));
  assert.equal(f.stats().scanHash, response.body.sha256);
  assert.equal(f.stats().scanBytes, body.length);
  assert.equal(response.body.retryable, false);
  assert.ok(response.body.signatureUpdatedAt);
  assert.deepEqual(Object.keys(f.metrics[0] as object).sort(), ['durationMs', 'event', 'verdict']);
});

test('fake daemon VERSION stays frozen across seconds until an explicit reload', async t => {
  const now = Date.now();
  t.mock.timers.enable({ apis: ['Date'], now });
  const f = await fixture(); t.after(f.close);
  const first = await command(f.config.socketPath, 'VERSION', AbortSignal.timeout(1000));
  t.mock.timers.setTime(now + 2000);
  assert.equal(await command(f.config.socketPath, 'VERSION', AbortSignal.timeout(1000)), first);
  assert.equal((await call(f.port)).body.verdict, 'clean');
});

for (const reply of ['stream: OK', 'stream: OK\0stream: OK\0', 'stream: OK\0garbage', '\0',
  'stream: OK\n\0', `stream: ${'X'.repeat(5000)}\0`, 'nonsense\0']) {
  test(`malformed daemon reply fails closed (${JSON.stringify(reply.slice(0, 30))})`, async t => {
    const f = await fixture({ reply }); t.after(f.close);
    const response = await call(f.port);
    assert.equal(response.status, 503);
    assert.equal(response.body.verdict, 'error');
    assert.equal(response.body.errorCode, 'CLAMD_PROTOCOL');
    assert.equal(response.body.retryable, false);
  });
}

test('exactly 70MiB accepted; actual byte count rejects one extra byte with chunked framing', async t => {
  const f = await fixture(); t.after(f.close);
  const body = Buffer.alloc(MAX_BYTES, 65);
  assert.equal((await call(f.port, body, { chunked: true })).body.verdict, 'clean');
  const oversized = await call(f.port, Buffer.alloc(MAX_BYTES + 1), { chunked: true });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.verdict, 'unscannable');
  assert.equal(oversized.body.sha256, null);
  assert.equal(oversized.body.errorCode, 'PAYLOAD_TOO_LARGE');
});

test('oversize immediately followed by end is terminal: no digest or daemon submission', async t => {
  const f = await fixture(); t.after(f.close);
  const oversized = Buffer.alloc(MAX_BYTES + 1);
  for (let attempt = 0; attempt < 10; attempt++) {
    const request = new IncomingMessage(new Socket());
    let emitted = false;
    request.complete = true;
    request.pause = () => request;
    request.resume = () => {
      if (!emitted) {
        emitted = true;
        // Register end listeners first, then emit both events in one turn,
        // before promise-rejection cleanup can remove either callback.
        queueMicrotask(() => {
          request.emit('data', oversized);
          request.emit('end');
        });
      }
      return request;
    };
    let digest: string | null = null;
    const daemonStates: boolean[] = [];
    await assert.rejects(scanStream(request, f.config.socketPath, AbortSignal.timeout(1000),
      hash => { digest = hash; }, scanning => daemonStates.push(scanning)),
    (error: any) => error.errorCode === 'PAYLOAD_TOO_LARGE');
    await immediate();
    assert.equal(digest, null, `attempt ${attempt}: an incomplete body must not be hashed as complete`);
    assert.ok(!daemonStates.includes(true), `attempt ${attempt}: rejected upload must not start scanning`);
    assert.equal(f.stats().scanTerminations, 0);
  }
});

test('repeated oversized HTTP uploads return null hash and do not put the next scan into cooldown', async t => {
  const f = await fixture(); t.after(f.close);
  const oversized = Buffer.alloc(MAX_BYTES + 1);
  for (let attempt = 0; attempt < 10; attempt++) {
    const rejected = await call(f.port, oversized);
    assert.equal(rejected.status, 413, `attempt ${attempt}`);
    assert.equal(rejected.body.sha256, null, `attempt ${attempt}`);
    const next = await call(f.port);
    assert.equal(next.status, 200, `attempt ${attempt}: unnecessary cooldown`);
    assert.equal(next.body.verdict, 'clean', `attempt ${attempt}`);
    assert.equal(f.stats().scanTerminations, attempt + 1, 'only successful follow-ups submit end markers');
  }
});

test('empty stream has the complete empty SHA-256, never missing metadata', async t => {
  const f = await fixture(); t.after(f.close);
  const result = await call(f.port, Buffer.alloc(0));
  assert.equal(result.body.verdict, 'clean');
  assert.equal(result.body.sha256, createHash('sha256').digest('hex'));
  assert.ok(result.body.engineVersion && result.body.signatureVersion && result.body.signatureUpdatedAt);
});

for (const value of [version(new Date(Date.now() - 72 * 3600000)), version(new Date(Date.now() + 3600000)), 'ClamAV 1.4.3']) {
  test('scans as well as readiness reject invalid signature state', async t => {
    const f = await fixture({ version: value }); t.after(f.close);
    const result = await call(f.port);
    assert.equal(result.status, 503);
    assert.equal(result.body.verdict, 'error');
    assert.equal(f.stats().scans, 0);
    assert.equal((await call(f.port, Buffer.alloc(0), { method: 'GET', path: '/health/ready' })).status, 503);
  });
}

test('malware/limit contract', async t => {
  for (const [reply, verdict] of [['stream: Win.Test.EICAR_HDB-1 FOUND\0', 'infected'],
    ['stream: Heuristics.Limits.Exceeded.MaxScanSize FOUND\0', 'unscannable']]) {
    const f = await fixture({ reply });
    try {
      const result = await call(f.port);
      assert.equal(result.status, 200);
      assert.equal(result.body.verdict, verdict);
      assert.equal(result.body.retryable, false);
      assert.match(result.body.sha256, /^[a-f0-9]{64}$/);
    } finally { await f.close(); }
  }
});
