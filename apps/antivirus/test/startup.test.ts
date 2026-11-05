import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('startup identifies invalid settings without logging environment values or secrets', () => {
  const token = 'secret-token-never-logged-'.repeat(3);
  const prod = { NODE_ENV: 'production', ANTIVIRUS_TOKEN: token, ANTIVIRUS_PRIVATE_ONLY: 'true',
    ANTIVIRUS_HOST: '1.scanner.ap-test.pn-test.private-network.internal' };
  const cases: [NodeJS.ProcessEnv, string][] = [
    [{ ...prod, ANTIVIRUS_TOKEN: 'secret-invalid-token' }, 'Invalid ANTIVIRUS_TOKEN'],
    [{ ...prod, ANTIVIRUS_PRIVATE_ONLY: undefined }, 'Production requires ANTIVIRUS_PRIVATE_ONLY=true'],
    [{ ...prod, ANTIVIRUS_HOST: undefined }, 'Production requires ANTIVIRUS_HOST'],
    [{ ...prod, ANTIVIRUS_HOST: '   ' }, 'Production requires ANTIVIRUS_HOST'],
    [{ ...prod, CLAMD_DISABLE_DAEMON: 'true' }, 'ClamAV daemons must be enabled for scanner'],
    [{ ...prod, SCAN_TIMEOUT_MS: 'sensitive-invalid-limit' }, 'Invalid SCAN_TIMEOUT_MS'],
    [{ ...prod, CLAMD_SOCKET_PATH: 'sensitive-relative-path' }, 'CLAMD_SOCKET_PATH must be an absolute Unix socket path'],
  ];
  for (const [env, reason] of cases) {
    const result = spawnSync(process.execPath, [new URL('../src/main.ts', import.meta.url).pathname], {
      env, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), { event: 'startup_configuration_error', reason });
    assert.doesNotMatch(result.stderr, /secret-|sensitive-/);
  }
});

test('production startup rejects non-private resolved addresses before listening', () => {
  for (const host of ['127.0.0.1', '0.0.0.0', '203.0.113.1']) {
    const result = spawnSync(process.execPath, [new URL('../src/main.ts', import.meta.url).pathname], {
      env: { NODE_ENV: 'production', ANTIVIRUS_TOKEN: 'x'.repeat(32),
        ANTIVIRUS_PRIVATE_ONLY: 'true', ANTIVIRUS_HOST: host },
      encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), {
      event: 'startup_configuration_error',
      reason: 'Private hostname must resolve to the single Scalingo private-network interface',
    });
  }
});

test('Scalingo launcher maps its injected hostname to ANTIVIRUS_HOST without overriding an explicit value', () => {
  const procfile = readFileSync(new URL('../Procfile', import.meta.url), 'utf8').trim();
  assert.ok(procfile.startsWith('scanner: '));
  assert.ok(procfile.endsWith(' pnpm start'));
  const command = procfile.slice('scanner: '.length).replace(/pnpm start$/, '"$NODE_BINARY" -e \'process.stdout.write(process.env.ANTIVIRUS_HOST)\'');
  for (const override of [undefined, '', 'custom-scanner.internal']) {
    const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', command], {
      env: { NODE_BINARY: process.execPath, SCALINGO_PRIVATE_HOSTNAME: 'platform-scanner.internal', ANTIVIRUS_HOST: override },
      encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, override || 'platform-scanner.internal');
  }
});
