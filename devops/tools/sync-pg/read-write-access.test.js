const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('pg');
const SchemaManager = require('./schema-manager');
const { LIVE_SCHEMAS } = require('./schemas');

function setup(t, writeUsers, { readUsers, connectError, queryError, endError } = {}) {
  const queries = [];
  const warnings = [];
  const connect = t.mock.method(Client.prototype, 'connect', async () => {
    if (connectError) throw connectError;
  });
  t.mock.method(Client.prototype, 'query', async (sql) => {
    queries.push(sql);
    const error = queryError?.(sql);
    if (error) throw error;
  });
  const end = t.mock.method(Client.prototype, 'end', async () => {
    if (endError) throw endError;
  });
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const manager = new SchemaManager({ pg: { connectionString: 'postgres://unused/verseau', readUsers, writeUsers } });
  return { manager, queries, warnings, connect, end };
}

test('does not connect when no read/write users are configured', async (t) => {
  for (const users of [undefined, []]) {
    const { manager, connect } = setup(t, users);
    await manager.grantReadWriteAccess();
    assert.equal(connect.mock.callCount(), 0);
    t.mock.restoreAll();
  }
});

test('quotes role names and grants schema usage, table CRUD and sequence access on every live schema', async (t) => {
  const { manager, queries, warnings, end } = setup(t, ['reader"; DROP SCHEMA public; --']);
  await manager.grantReadWriteAccess();
  assert.equal(queries.length, LIVE_SCHEMAS.length);
  for (const [index, schema] of LIVE_SCHEMAS.entries()) {
    assert.equal(queries[index].trim(),
      `GRANT USAGE ON SCHEMA "${schema}" TO "reader""; DROP SCHEMA public; --";\n` +
      `              GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema}" TO "reader""; DROP SCHEMA public; --";\n` +
      `              GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${schema}" TO "reader""; DROP SCHEMA public; --";`);
  }
  assert.deepEqual(warnings, []);
  assert.equal(end.mock.callCount(), 1);
});

test('read users receive only schema USAGE and table SELECT, without sequence usage', async (t) => {
  const { manager, queries, warnings } = setup(t, undefined, { readUsers: ['user1'] });
  await manager.grantReadWriteAccess();
  assert.equal(queries.length, LIVE_SCHEMAS.length);
  for (const [index, schema] of LIVE_SCHEMAS.entries()) {
    const statements = queries[index].split(';').map((sql) => sql.trim()).filter(Boolean);
    assert.deepEqual(statements, [
      `GRANT USAGE ON SCHEMA "${schema}" TO "user1"`,
      `GRANT SELECT ON ALL TABLES IN SCHEMA "${schema}" TO "user1"`,
    ]);
  }
  assert.deepEqual(warnings, []);
});

test('users in both lists receive write access once per schema', async (t) => {
  const { manager, queries } = setup(t, ['user1', 'user1'], { readUsers: ['user1', 'user1'] });
  await manager.grantReadWriteAccess();
  assert.equal(queries.length, LIVE_SCHEMAS.length);
  assert.ok(queries.every((sql) => sql.includes('SELECT, INSERT, UPDATE, DELETE') && sql.includes('ALL SEQUENCES')));
});

test('a missing read user does not prevent grants to write users', async (t) => {
  const { manager, queries, warnings } = setup(t, ['user2'], {
    readUsers: ['user1'],
    queryError: (sql) => sql.includes('TO "user1"') ? new Error('role does not exist') : undefined,
  });
  await assert.doesNotReject(manager.grantReadWriteAccess());
  assert.equal(warnings.length, LIVE_SCHEMAS.length);
  assert.equal(queries.filter((sql) => sql.includes('TO "user2"')).length, LIVE_SCHEMAS.length);
});

test('logs a failed grant and continues with the remaining schemas and users', async (t) => {
  const error = Object.assign(new Error('permission denied for schema roseau'), { code: '42501' });
  const { manager, queries, warnings, end } = setup(t, ['user1', 'user2'], {
    queryError: (sql) => sql.includes('"roseau" TO "user1"') ? error : undefined,
  });
  await assert.doesNotReject(manager.grantReadWriteAccess());
  assert.equal(queries.length, LIVE_SCHEMAS.length * 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /continuing restoration/);
  assert.deepEqual(warnings[0][1], {
    user: 'user1', schema: 'roseau', code: '42501', message: error.message,
  });
  assert.equal(end.mock.callCount(), 1);
});

test('connection failures are logged and do not propagate', async (t) => {
  const { manager, queries, warnings, end } = setup(t, ['reader'], {
    connectError: Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }),
  });
  await assert.doesNotReject(manager.grantReadWriteAccess());
  assert.deepEqual(queries, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][1].code, 'ECONNREFUSED');
  assert.equal(end.mock.callCount(), 1);
});

test('connection cleanup failures are logged and do not propagate', async (t) => {
  const { manager, warnings } = setup(t, ['reader'], { endError: new Error('close failed') });
  await assert.doesNotReject(manager.grantReadWriteAccess());
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /close the read\/write-grant connection/);
  assert.equal(warnings[0][1].message, 'close failed');
});
