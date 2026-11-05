import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { applyPolicy, configure, fixProcessTypeDetection, policy } from '../scripts/configure-clamd.mjs';

const upstreamProfile = 'current_process_type="$( echo "${CONTAINER}" | rev | cut -d\'-\' -f2- | rev )"\n';

test('build hook extends generated clamd conf before daemon startup, idempotently', async t => {
  const root = await mkdtemp(join(tmpdir(), 'av-hook-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'clamav/conf'), { recursive: true });
  await mkdir(join(root, '.profile.d'));
  const original = 'DatabaseDirectory /app/clamav/data\nLocalSocket /app/clamav/run/clamd.sock\nLogVerbose yes\nForeground no\n';
  const path = join(root, 'clamav/conf/clamd.conf');
  await writeFile(path, original);
  const profile = join(root, '.profile.d/010-clamav.sh');
  await writeFile(profile, upstreamProfile);
  await configure(root);
  const configured = await readFile(path, 'utf8');
  assert.equal(configured, applyPolicy(configured));
  for (const [key, value] of Object.entries(policy)) {
    assert.equal(configured.split('\n').filter(line => line.startsWith(`${key} `)).join(), `${key} ${value}`);
  }
  assert.match(configured, /Foreground no/);
  assert.equal(await readFile(join(root, '.profile.d/005-antivirus-timezone.sh'), 'utf8'), 'export TZ=UTC\n');
  assert.equal(await readFile(profile, 'utf8'), fixProcessTypeDetection(upstreamProfile));
  await configure(root);
  assert.equal(await readFile(path, 'utf8'), configured);
  await writeFile(path, 'LocalSocket /some/other/socket\n');
  await assert.rejects(configure(root));
});

test('process-type detection needs no external commands and preserves hyphenated names', () => {
  const patched = fixProcessTypeDetection(upstreamProfile);
  assert.equal(fixProcessTypeDetection(patched), patched);
  assert.throws(() => fixProcessTypeDetection('changed upstream layout'));
  for (const [container, expected] of [['web-1', 'web'], ['scanner-12', 'scanner'], ['one-off-123', 'one-off'], ['my-scanner-2', 'my-scanner']]) {
    const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', `${patched}printf '%s' "$current_process_type"`], {
      env: { CONTAINER: container, PATH: '/nonexistent' }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, expected);
  }
});
