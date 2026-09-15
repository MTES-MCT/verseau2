const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('pg');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');

const { RestoreReportRepository } = require('./restore-report.repository');

let container;
let client;
let repository;

test.before(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();
  await client.query(`
    CREATE SCHEMA roseau;
    CREATE SCHEMA lanceleau;
    CREATE TABLE roseau.resa (resa_calc_dt timestamp without time zone);
    INSERT INTO roseau.resa VALUES ('2026-01-15 11:00:00');
    CREATE TABLE roseau.suivqual (suivqual_der_trans_dt timestamp without time zone);
    INSERT INTO roseau.suivqual VALUES ('2026-01-15 12:00:00');
    CREATE TABLE lanceleau.t_orion_role_for_principal (beginning_date timestamp without time zone);
    INSERT INTO lanceleau.t_orion_role_for_principal VALUES ('2026-07-15 12:00:00');
    CREATE TABLE lanceleau.t_orion_credentials (beginning_date timestamp without time zone);
    CREATE TABLE lanceleau.itv (itv_maj_dt timestamp without time zone, itv_cre_dt timestamp without time zone);
  `);
  repository = new RestoreReportRepository({ pg: { connectionString: container.getConnectionUri() } });
});

test.after(async () => {
  await client?.end();
  await container?.stop();
});

test('reports null freshness and converts Paris winter and summer timestamps', async () => {
  const freshness = await repository.collectFreshness();
  const bySource = new Map(freshness.map((entry) => [entry.source, entry]));

  assert.deepEqual(bySource.get('roseau.resa.resa_calc_dt'), {
    source: 'roseau.resa.resa_calc_dt',
    latestUtc: '2026-01-15T11:00:00.000Z',
    latestParis: '2026-01-15 12:00:00 Europe/Paris',
  });
  assert.deepEqual(bySource.get('roseau.suivqual.suivqual_der_trans_dt'), {
    source: 'roseau.suivqual.suivqual_der_trans_dt',
    latestUtc: '2026-01-15T11:00:00.000Z',
    latestParis: '2026-01-15 12:00:00 Europe/Paris',
  });
  assert.deepEqual(bySource.get('lanceleau.t_orion_role_for_principal.beginning_date'), {
    source: 'lanceleau.t_orion_role_for_principal.beginning_date',
    latestUtc: '2026-07-15T10:00:00.000Z',
    latestParis: '2026-07-15 12:00:00 Europe/Paris',
  });

  for (const source of [
    'lanceleau.t_orion_credentials.beginning_date',
    'lanceleau.itv.itv_maj_dt',
    'lanceleau.itv.itv_cre_dt',
  ]) {
    assert.deepEqual(bySource.get(source), { source, latestUtc: null, latestParis: null });
  }
});
