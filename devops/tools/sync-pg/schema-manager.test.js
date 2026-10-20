const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client, escapeIdentifier } = require('pg');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const SchemaManager = require('./schema-manager');
const { LIVE_SCHEMAS } = require('./schemas');

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

test('grants real read/write access, survives missing roles and reapplies grants to replacement objects', async (t) => {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const connectionString = container.getConnectionUri();
  const client = new Client({ connectionString });
  const readUsers = ['user1', 'Reader-1'];
  const writeUsers = ['user2', 'reader"; DROP SCHEMA roseau CASCADE; --'];
  const users = [...readUsers, ...writeUsers];
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  try {
    await client.connect();
    for (const user of users) {
      await client.query(`CREATE ROLE ${escapeIdentifier(user)}`);
    }
    for (const schema of LIVE_SCHEMAS) {
      await client.query(`CREATE SCHEMA ${schema}; CREATE TABLE ${schema}.sample (id SERIAL PRIMARY KEY, value INTEGER NOT NULL DEFAULT 1);`);
      await client.query(`INSERT INTO ${schema}.sample DEFAULT VALUES`);
    }
    await client.query('CREATE MATERIALIZED VIEW verseau.sample_view AS SELECT * FROM verseau.sample');

    const manager = new SchemaManager({ pg: { connectionString, readUsers: ['missing_reader', ...readUsers, 'user2'], writeUsers } });
    await manager.grantReadWriteAccess();
    assert.equal(warnings.length, LIVE_SCHEMAS.length);
    assert.ok(warnings.every(([, details]) => details.user === 'missing_reader' && details.code === '42704'));

    for (const user of users) {
      const canWrite = writeUsers.includes(user);
      for (const schema of LIVE_SCHEMAS) {
        const { rows: [permissions] } = await client.query(`
          SELECT has_schema_privilege($1, $2, 'USAGE') AS usage,
                 has_schema_privilege($1, $2, 'CREATE') AS create,
                 has_table_privilege($1, $3, 'SELECT') AS select,
                 has_table_privilege($1, $3, 'INSERT') AS insert,
                 has_table_privilege($1, $3, 'UPDATE') AS update,
                 has_table_privilege($1, $3, 'DELETE') AS delete,
                 has_table_privilege($1, $3, 'TRUNCATE') AS truncate,
                 has_sequence_privilege($1, $4, 'USAGE') AS sequence_usage,
                 has_sequence_privilege($1, $4, 'SELECT') AS sequence_select,
                 has_sequence_privilege($1, $4, 'UPDATE') AS sequence_update
        `, [user, schema, `${schema}.sample`, `${schema}.sample_id_seq`]);
        assert.deepEqual(permissions, {
          usage: true, create: false, select: true, insert: canWrite, update: canWrite, delete: canWrite, truncate: false,
          sequence_usage: canWrite, sequence_select: canWrite, sequence_update: false,
        });
      }
      await client.query(`SET ROLE ${escapeIdentifier(user)}`);
      const result = await client.query('SELECT * FROM verseau.sample_view');
      assert.deepEqual(result.rows, [{ id: 1, value: 1 }]);
      for (const schema of LIVE_SCHEMAS) {
        if (!canWrite) {
          for (const sql of [
            `INSERT INTO ${schema}.sample DEFAULT VALUES`,
            `UPDATE ${schema}.sample SET value = 2 WHERE id = 1`,
            `DELETE FROM ${schema}.sample WHERE id = 1`,
            `SELECT nextval('${schema}.sample_id_seq')`,
          ]) {
            await assert.rejects(client.query(sql), { code: '42501' });
          }
          continue;
        }
        const inserted = await client.query(`INSERT INTO ${schema}.sample DEFAULT VALUES RETURNING id, value`);
        const { id } = inserted.rows[0];
        assert.ok(id > 1);
        assert.equal(inserted.rows[0].value, 1);
        const updated = await client.query(`UPDATE ${schema}.sample SET value = 2 WHERE id = $1 RETURNING value`, [id]);
        assert.deepEqual(updated.rows, [{ value: 2 }]);
        const deleted = await client.query(`DELETE FROM ${schema}.sample WHERE id = $1 RETURNING id`, [id]);
        assert.deepEqual(deleted.rows, [{ id }]);
      }
      await client.query('RESET ROLE');
    }

    // A restore creates new objects without the previous objects' grants.
    await client.query('DROP SCHEMA lanceleau CASCADE; CREATE SCHEMA lanceleau; CREATE TABLE lanceleau.sample (id INTEGER)');
    const before = await client.query("SELECT has_schema_privilege($1, 'lanceleau', 'USAGE') AS allowed", [users[0]]);
    assert.equal(before.rows[0].allowed, false);
    await manager.grantReadWriteAccess();
    for (const user of users) {
      const after = await client.query(`
        SELECT has_table_privilege($1, 'lanceleau.sample', 'SELECT') AS read,
               has_table_privilege($1, 'lanceleau.sample', 'INSERT') AS write
      `, [user]);
      assert.deepEqual(after.rows[0], { read: true, write: writeUsers.includes(user) });
    }
  } finally {
    await client.end();
    await container.stop();
  }
});
