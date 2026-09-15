const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadTchapConfig, loadLogsUrl } = require('./tchap-config');

const env = {
  TCHAP_HOMESERVER_URL: 'https://matrix.example.org',
  TCHAP_ACCESS_TOKEN: 'test-token',
  TCHAP_ROOM_ID: '!room:example.org',
  TCHAP_USER_ID: '@bot:example.org',
  SYNC_PG_LOGS_URL: 'https://logs.example.org/dashboard?service=sync-pg',
};
const logger = { log() {}, warn() {}, error() {} };
const config = { aws: { bucket: 'dump' }, pg: { connectionString: 'postgres://db/test' } };
const reportSource = readFileSync(path.join(__dirname, 'restore-report.js'), 'utf8');
const indexSource = readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const freshness = [{ source: 'roseau.resa', latestUtc: '2026-01-15T11:00:00Z', latestParis: null }];

function loadReport({ environment = env, collectFreshness = async () => freshness, sendText = async () => {}, log = logger, loadService } = {}) {
  return vm.runInNewContext(reportSource, {
    module: { exports: {} },
    console: log,
    require(name) {
      switch (name) {
        case './config': return config;
        case './tchap-config': return {
          loadTchapConfig: () => loadTchapConfig(environment, log),
          loadLogsUrl: () => loadLogsUrl(environment, log),
        };
        case './restore-report.repository': return {
          RestoreReportRepository: class { collectFreshness = collectFreshness; },
        };
        case './tchap-service':
          loadService?.();
          return { TchapService: class { sendText = sendText; } };
        default: assert.fail(`Unexpected dependency: ${name}`);
      }
    },
  });
}

test('validates Tchap configuration and the optional logs link independently', () => {
  assert.equal(loadTchapConfig({}, logger).enabled, false);
  assert.equal(loadTchapConfig({ TCHAP_ACCESS_TOKEN: 'token' }, logger).enabled, false);
  assert.equal(loadTchapConfig(env, logger).enabled, true);
  for (const invalid of [
    { TCHAP_HOMESERVER_URL: 'http://matrix.example.org' },
    { TCHAP_ROOM_ID: 'room' },
    { TCHAP_USER_ID: 'bot' },
  ]) {
    assert.equal(loadTchapConfig({ ...env, ...invalid }, logger).enabled, false);
  }
  assert.equal(loadLogsUrl(env, logger), env.SYNC_PG_LOGS_URL);
  assert.equal(loadLogsUrl({}, logger), undefined);
  for (const value of ['invalid', 'javascript:alert(1)', 'https://user:password@logs.example.org', 'https://logs.example.org/\ninjected']) {
    assert.equal(loadLogsUrl({ SYNC_PG_LOGS_URL: value }, logger), undefined);
  }
});

for (const error of [undefined, 'Restore failed', '']) {
  test(`creates a final report and collects current freshness: ${JSON.stringify(error)}`, async () => {
    let queries = 0;
    const { createReport } = loadReport({ collectFreshness: async () => { queries++; return freshness; } });
    const text = await createReport(error);
    assert.equal(queries, 1);
    assert.ok(text.includes(error === undefined ? 'RÉUSSIE' : 'ERREUR'));
    if (error !== undefined) assert.ok(text.includes(`Erreur : ${error}`));
    assert.ok(text.includes('UTC : 2026-01-15T11:00:00Z'));
    assert.ok(text.includes('Europe/Paris : valeur nulle'));
    assert.ok(text.includes(`Logs : ${env.SYNC_PG_LOGS_URL}`));
    assert.doesNotMatch(text, /Publication|Tables|Étape|Fichier/);
  });
}

test('freshness failure and invalid logs links do not prevent sending the final status', async () => {
  const sent = [];
  const { sendReport } = loadReport({
    environment: { ...env, SYNC_PG_LOGS_URL: 'invalid' },
    collectFreshness: async () => { throw new Error('database unavailable'); },
    sendText: async (text) => { sent.push(text); },
  });
  await sendReport();
  await sendReport('Restore failed');
  assert.equal(sent.length, 2);
  assert.ok(sent[0].includes('RÉUSSIE'));
  assert.ok(sent[1].includes('ERREUR'));
  for (const text of sent) {
    assert.ok(text.includes('fraîcheur indisponible'));
    assert.doesNotMatch(text, /Logs :|database unavailable/);
  }
});

test('SDK loading and sending failures are swallowed with only a generic warning', async () => {
  const fail = () => { throw new Error('SDK request details'); };
  for (const failure of [{ sendText: fail }, { loadService: fail }]) {
    const warnings = [];
    const { sendReport } = loadReport({ ...failure, log: { warn: (...args) => warnings.push(args) } });
    await sendReport();
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].length, 1);
    assert.doesNotMatch(warnings[0][0], /SDK request details/);
  }
});

test('disabled notifications skip freshness and SDK loading', async () => {
  for (const environment of [{}, { TCHAP_ACCESS_TOKEN: 'token' }]) {
    await loadReport({ environment, collectFreshness: assert.fail, loadService: assert.fail }).sendReport();
  }
});

for (const error of [undefined, new Error('Restore failed'), new Error(''), 'Non-Error failure']) {
  test(`index awaits one final report before exiting: ${String(error)}`, async () => {
    const events = [];
    class Services {
      async downloadFile() { return './dump.backup'; }
      async verifyDumpContents() { if (error !== undefined) throw error; }
      async dropStagingSchemas() {}
      async restoreToStaging() {}
      async validateStagingSchemas() { return {}; }
      async swapStagingToLive() {}
      async createVSteuSclItvMaterializedView() {}
    }
    const modules = {
      fs: { existsSync: () => true, unlinkSync() { if (error !== undefined) throw new Error('Cleanup failed'); } },
      path,
      './config': config,
      './s3-service': Services,
      './pg-service': Services,
      './schema-manager': Services,
      './schemas': { EXCLUDED_TABLES: [] },
      './server': {},
      './restore-report': {
        async sendReport(message) {
          assert.equal(message, error instanceof Error ? error.message : error);
          await new Promise(setImmediate);
          assert.ok(!events.includes('exit'));
          events.push('sent');
        },
      },
    };
    await vm.runInNewContext(indexSource, {
      require(name) { assert.ok(Object.hasOwn(modules, name)); return modules[name]; },
      Error,
      console: logger,
      process: { exit(code) { assert.equal(code, 1); events.push('exit'); } },
    });
    assert.deepEqual(events, error === undefined ? ['sent'] : ['sent', 'exit']);
  });
}
