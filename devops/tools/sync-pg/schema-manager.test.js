const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('pg');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const SchemaManager = require('./schema-manager');

test('finds the latest committed dump, including before the tracking table exists', async () => {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const client = new Client({ connectionString: container.getConnectionUri() });
  try {
    await client.connect();
    const manager = new SchemaManager({ pg: { connectionString: container.getConnectionUri() } });
    assert.equal(await manager.getLastRestoredDumpSource(), null);

    await client.query('CREATE TABLE public.sync_tracking (id SERIAL PRIMARY KEY, dump_source TEXT NOT NULL)');
    assert.equal(await manager.getLastRestoredDumpSource(), null);

    await client.query("INSERT INTO public.sync_tracking (dump_source) VALUES ('previous.backup'), ('latest.backup')");
    assert.equal(await manager.getLastRestoredDumpSource(), 'latest.backup');
  } finally {
    await client.end();
    await container.stop();
  }
});
