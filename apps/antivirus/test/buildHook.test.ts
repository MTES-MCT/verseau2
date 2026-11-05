import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyPolicy, configure, policy } from '../scripts/configure-clamd.mjs';

test('build hook extends generated clamd conf before daemon startup, idempotently', async t => {
  const root = await mkdtemp(join(tmpdir(), 'av-hook-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'clamav/conf'), { recursive: true });
  await mkdir(join(root, '.profile.d'));
  const original = 'DatabaseDirectory /app/clamav/data\nLocalSocket /app/clamav/run/clamd.sock\nLogVerbose yes\nForeground no\n';
  const path = join(root, 'clamav/conf/clamd.conf');
  await writeFile(path, original);
  await configure(root);
  const configured = await readFile(path, 'utf8');
  assert.equal(configured, applyPolicy(configured));
  for (const [key, value] of Object.entries(policy)) {
    assert.equal(configured.split('\n').filter(line => line.startsWith(`${key} `)).join(), `${key} ${value}`);
  }
  assert.match(configured, /Foreground no/);
  assert.equal(await readFile(join(root, '.profile.d/005-antivirus-timezone.sh'), 'utf8'), 'export TZ=UTC\n');
  await writeFile(path, 'LocalSocket /some/other/socket\n');
  await assert.rejects(configure(root));
});
