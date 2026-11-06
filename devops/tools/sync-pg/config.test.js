const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, 'config.js'), 'utf8');

function loadConfig(env) {
  const module = { exports: {} };
  vm.runInNewContext(source, { require, module, process: { env } });
  return module.exports;
}

test('read/write users are optional, including an empty or whitespace-only list', () => {
  for (const value of [undefined, '', '  ', ', ,']) {
    const config = loadConfig({ SYNC_PG_READ_USERS: value, SYNC_PG_WRITE_USERS: value });
    assert.deepEqual(Array.from(config.pg.readUsers), []);
    assert.deepEqual(Array.from(config.pg.writeUsers), []);
  }
});

test('trims and deduplicates read/write users while preserving case and special characters', () => {
  const config = loadConfig({
    DATABASE_URL: 'postgres://db/verseau',
    SYNC_PG_READ_USERS: ' user1, ,user2,user1,Reader-1,reader"2 ',
    SYNC_PG_WRITE_USERS: ' user1, ,user2,user1,Reader-1,reader"2 ',
  });
  assert.equal(config.pg.connectionString, 'postgres://db/verseau');
  assert.deepEqual(Array.from(config.pg.readUsers), ['user1', 'user2', 'Reader-1', 'reader"2']);
  assert.deepEqual(Array.from(config.pg.writeUsers), ['user1', 'user2', 'Reader-1', 'reader"2']);
});

test('read and write user lists can be configured independently', () => {
  const readOnly = loadConfig({ SYNC_PG_READ_USERS: 'user1' });
  assert.deepEqual(Array.from(readOnly.pg.readUsers), ['user1']);
  assert.deepEqual(Array.from(readOnly.pg.writeUsers), []);
  const writeOnly = loadConfig({ SYNC_PG_WRITE_USERS: 'user2' });
  assert.deepEqual(Array.from(writeOnly.pg.readUsers), []);
  assert.deepEqual(Array.from(writeOnly.pg.writeUsers), ['user2']);
});
