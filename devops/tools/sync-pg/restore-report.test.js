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
const freshness = [
  {
    source: 'lanceleau.t_orion_credentials.beginning_date',
    latestUtc: '2026-09-18T10:00:00Z',
    latestParis: '2026-09-18 12:00:00 Europe/Paris',
  },
  { source: 'roseau.resa', latestUtc: null, latestParis: null },
];
const report = {
  fileName: 'dump.backup',
  excludedTables: ['custom_ingestion_roseau.alr', 'custom_ingestion_roseau.ple'],
  durationMs: 3_661_999,
};

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
    const text = await createReport({ ...report, error });
    assert.equal(queries, 1);
    assert.ok(text.includes(error === undefined ? 'RÉUSSIE' : 'ERREUR'));
    if (error !== undefined) assert.ok(text.includes(`Erreur : ${error}`));
    assert.ok(text.includes('- 2026-09-18 : lanceleau.t_orion_credentials.beginning_date'));
    assert.ok(text.includes('- valeur nulle : roseau.resa'));
    assert.ok(text.includes(`Logs : ${env.SYNC_PG_LOGS_URL}`));
    assert.ok(text.includes('Fichier du dump : dump.backup'));
    assert.ok(text.includes('Durée du traitement : 1 h 1 min 1 s'));
    assert.ok(text.includes(`Tables exclues configurées :\n- ${report.excludedTables.join('\n- ')}`));
    assert.doesNotMatch(text, /Publication|Étape/);
  });
}

test('formats unavailable filenames, empty exclusions, and duration boundaries', async () => {
  const { createReport } = loadReport();
  for (const [durationMs, duration] of [[0, '0 h 0 min 0 s'], [999, '0 h 0 min 0 s'], [60_000, '0 h 1 min 0 s'], [90_000_000, '25 h 0 min 0 s']]) {
    const text = await createReport({ excludedTables: [], durationMs });
    assert.ok(text.includes('Fichier du dump : indisponible'));
    assert.ok(text.includes('Tables exclues configurées :\n- aucune'));
    assert.ok(text.includes(`Durée du traitement : ${duration}`));
  }
});

test('freshness failure and invalid logs links do not prevent sending the final status', async () => {
  const sent = [];
  const { sendReport } = loadReport({
    environment: { ...env, SYNC_PG_LOGS_URL: 'invalid' },
    collectFreshness: async () => { throw new Error('database unavailable'); },
    sendText: async (text) => { sent.push(text); },
  });
  await sendReport(report);
  await sendReport({ ...report, error: 'Restore failed' });
  assert.equal(sent.length, 2);
  assert.ok(sent[0].includes('RÉUSSIE'));
  assert.ok(sent[1].includes('ERREUR'));
  for (const text of sent) {
    assert.ok(text.includes('Fichier du dump : dump.backup'));
    assert.ok(text.includes('Durée du traitement : 1 h 1 min 1 s'));
    assert.ok(text.includes(`Tables exclues configurées :\n- ${report.excludedTables.join('\n- ')}`));
    assert.ok(text.includes('fraîcheur indisponible'));
    assert.doesNotMatch(text, /Logs :|database unavailable/);
  }
});

test('SDK loading and sending failures are logged without propagating', async () => {
  const fail = () => { throw new Error('SDK request details'); };
  for (const failure of [{ sendText: fail }, { loadService: fail }]) {
    const errors = [];
    const { sendReport } = loadReport({ ...failure, log: { error: (...args) => errors.push(args) } });
    await sendReport(report);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][1].message, 'SDK request details');
  }
});

test('disabled notifications skip freshness and SDK loading', async () => {
  for (const environment of [{}, { TCHAP_ACCESS_TOKEN: 'token' }]) {
    await loadReport({ environment, collectFreshness: assert.fail, loadService: assert.fail }).sendReport(report);
  }
});

for (const { error, missingConfig } of [
  {},
  { error: new Error('Restore failed') },
  { error: new Error('') },
  { error: 'Non-Error failure' },
  { error: new Error('Missing S3 configuration. Please check .env file.'), missingConfig: true },
]) {
  test(`index awaits one final report before exiting: ${String(error)}`, async () => {
    const events = [];
    let verifiedFilePath;
    let now = 0;
    class TestDate extends Date {
      constructor() { super(now); }
      static now() { return now; }
    }
    class Services {
      async downloadFile() { return './dump.backup'; }
      async verifyDumpContents(filePath) {
        verifiedFilePath = filePath;
        now += 2000;
        if (error !== undefined) throw error;
      }
      async dropStagingSchemas() {}
      async restoreToStaging() {}
      async validateStagingSchemas() { return {}; }
      async swapStagingToLive() {}
      async createVSteuSclItvMaterializedView() {}
    }
    const modules = {
      fs: {
        existsSync() { now = 3000; return true; },
        unlinkSync() { now = 3000; if (error !== undefined) throw new Error('Cleanup failed'); },
      },
      path,
      './config': missingConfig ? { ...config, aws: {} } : config,
      './s3-service': Services,
      './pg-service': Services,
      './schema-manager': Services,
      './schemas': { EXCLUDED_TABLES: report.excludedTables },
      './server': {},
      './restore-report': {
        async sendReport(metadata) {
          assert.equal(metadata.error, error instanceof Error ? error.message : error);
          assert.equal(metadata.fileName, verifiedFilePath ? path.basename(verifiedFilePath) : undefined);
          assert.equal(metadata.excludedTables, report.excludedTables);
          assert.equal(metadata.durationMs, missingConfig ? 0 : 3000);
          now += 5000;
          await new Promise(setImmediate);
          assert.ok(!events.includes('exit'));
          events.push('sent');
        },
      },
    };
    await vm.runInNewContext(indexSource, {
      require(name) { assert.ok(Object.hasOwn(modules, name)); return modules[name]; },
      Error,
      Date: TestDate,
      console: logger,
      process: { exit(code) { assert.equal(code, 1); events.push('exit'); } },
    });
    assert.deepEqual(events, error === undefined ? ['sent'] : ['sent', 'exit']);
  });
}
