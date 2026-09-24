const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { EventEmitter } = require('node:events');
const { createServer } = require('node:http');
const { Readable } = require('node:stream');
const path = require('node:path');
const vm = require('node:vm');
const { S3Client: RealS3Client, PutObjectCommand: RealPutObjectCommand } = require('@aws-sdk/client-s3');

const source = readFileSync(path.join(__dirname, 'index-local-run.js'), 'utf8');
const sampleName = 'lanceleau_dump_20260913_sample';
const databaseName = 'sync_pg_test_ab';
const samplePath = path.join(__dirname, 'db', sampleName);

async function runLocalTest({ childExit = 0, uploadFails = false, dropFails = false, createFails = false, sampleMissing = false, missingFolder = false, missingS3Credentials = false } = {}) {
  const calls = [];
  const messages = [];
  const errors = [];
  const state = {
    execPath: '/usr/bin/node',
    env: {},
    exitCode: 0,
  };
  class Client {
    constructor({ connectionString }) { assert.equal(connectionString, 'postgres://db/main'); }
    async connect() { calls.push('connect'); }
    async query(sql) {
      if (sql === `CREATE DATABASE ${databaseName}`) {
        calls.push('create database');
        if (createFails) throw new Error('Create failed');
      } else {
        assert.equal(sql, `DROP DATABASE ${databaseName} WITH (FORCE)`);
        calls.push('drop database');
        if (dropFails) throw new Error('Drop failed');
      }
    }
    async end() { calls.push('close database connection'); }
  }
  class PutObjectCommand { constructor(input) { this.input = input; } }
  class DeleteObjectCommand { constructor(input) { this.input = input; } }
  class S3Client {
    constructor(config) {
      assert.equal(config.region, 'fr-par');
      assert.equal(config.credentials.accessKeyId, 'access');
      assert.equal(config.requestChecksumCalculation, 'WHEN_REQUIRED');
    }
    async send(command) {
      assert.equal(command.input.Bucket, 'test-bucket');
      assert.equal(command.input.Key, `dump_test/${sampleName}`);
      if (command instanceof PutObjectCommand) {
        assert.equal(command.input.IfNoneMatch, '*');
        assert.equal(command.input.Body, samplePath);
        assert.equal(command.input.ContentLength, 123);
        calls.push('upload');
        if (uploadFails) throw new Error('Upload failed');
      } else if (command instanceof DeleteObjectCommand) {
        calls.push('delete');
      } else {
        assert.fail('Unexpected S3 command');
      }
    }
    destroy() { calls.push('close S3 client'); }
  }
  const modules = {
    'node:child_process': {
      spawn(command, args, options) {
        assert.equal(command, state.execPath);
        assert.equal(Array.from(args).join(' '), '-e require("./index.js"); require("./server").close();');
        assert.equal(options.cwd, __dirname);
        assert.equal(options.env.DATABASE_URL, `postgres://db/${databaseName}`);
        assert.equal(options.env.S3_DUMP_FOLDER, 'dump_test');
        assert.equal(options.env.S3_BUCKET, 'test-bucket');
        assert.equal(options.env.S3_ENDPOINT, 'https://s3.example.test');
        assert.equal(options.env.TCHAP_ACCESS_TOKEN, 'local-token');
        calls.push('run index.js');
        const child = new EventEmitter();
        setImmediate(() => child.emit('close', childExit, null));
        return child;
      },
    },
    'node:crypto': { randomUUID: () => 'a-b' },
    'node:fs': {
      existsSync: (file) => { assert.equal(file, samplePath); return !sampleMissing; },
      createReadStream: (file) => file,
      statSync: (file) => { assert.equal(file, samplePath); return { size: 123 }; },
    },
    'node:path': path,
    '@aws-sdk/client-s3': { S3Client, PutObjectCommand, DeleteObjectCommand },
    pg: { Client },
    dotenv: {
      config(options) {
        if (options.path === path.join(__dirname, '.env.local')) {
          assert.equal(options.override, true);
          Object.assign(state.env, {
            S3_BUCKET: 'test-bucket', S3_REGION: 'fr-par', S3_ACCESS_KEY: 'access',
            S3_SECRET_KEY: missingS3Credentials ? '' : 'secret',
            S3_ENDPOINT: 'https://s3.example.test',
            TCHAP_ACCESS_TOKEN: 'local-token',
            S3_DUMP_FOLDER: 'dump', DATABASE_URL: 'postgres://db/prod',
          });
          return { parsed: state.env };
        }
        assert.equal(options.path, path.join(__dirname, '.env.test'));
        assert.ok(options.processEnv);
        assert.equal(state.env.S3_DUMP_FOLDER, 'dump');
        assert.equal(state.env.DATABASE_URL, 'postgres://db/prod');
        return { parsed: { DATABASE_URL: 'postgres://db/main', S3_DUMP_FOLDER: missingFolder ? 'other' : 'dump_test' } };
      },
    },
  };
  await vm.runInNewContext(source, {
    require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; },
    __dirname,
    console: { log(message) { messages.push(message); }, error(...args) { errors.push(args); } },
    process: state,
    URL,
  });
  return { calls, messages, errors, exitCode: state.exitCode };
}

test('uploads a sample, runs index.js and deletes the S3 object and test database', async () => {
  const { calls, messages, errors, exitCode } = await runLocalTest();
  assert.equal(exitCode, 0, errors.map((entry) => entry.join(' ')).join('\n'));
  assert.deepEqual(calls, ['connect', 'create database', 'upload', 'run index.js', 'delete', 'close S3 client', 'drop database', 'close database connection']);
  assert.ok(messages.some((message) => message.includes(`Test database created: ${databaseName}`)));
  assert.ok(messages.some((message) => message.includes(`Removed test database ${databaseName}`)));
});

test('deletes the uploaded S3 object and database if index.js fails', async () => {
  const { calls, exitCode } = await runLocalTest({ childExit: 1 });
  assert.equal(exitCode, 1);
  assert.ok(calls.includes('delete'));
  assert.ok(calls.includes('drop database'));
});

test('does not delete an object if the conditional upload fails', async () => {
  const { calls, exitCode } = await runLocalTest({ uploadFails: true });
  assert.equal(exitCode, 1);
  assert.ok(!calls.includes('delete'));
  assert.ok(!calls.includes('run index.js'));
  assert.ok(calls.includes('drop database'));
});

test('does not drop a database that was not created', async () => {
  const { calls, exitCode } = await runLocalTest({ createFails: true });
  assert.equal(exitCode, 1);
  assert.deepEqual(calls, ['connect', 'create database', 'close database connection']);
});

test('reports a failed database cleanup without hiding an earlier sync error', async () => {
  const { calls, errors, exitCode } = await runLocalTest({ childExit: 1, dropFails: true });
  assert.equal(exitCode, 1);
  assert.ok(calls.includes('drop database'));
  assert.match(errors.at(-1)[1].message, /index\.js exited with code 1/);
});

test('fails the local run if the temporary database could not be removed', async () => {
  const { errors, exitCode } = await runLocalTest({ dropFails: true });
  assert.equal(exitCode, 1);
  assert.match(errors.at(-1)[1].message, /Drop failed/);
});

test('does not start if the sample or dump_test folder is unavailable', async () => {
  const missingSample = await runLocalTest({ sampleMissing: true });
  const wrongFolder = await runLocalTest({ missingFolder: true });
  assert.equal(missingSample.exitCode, 1);
  assert.equal(wrongFolder.exitCode, 1);
  assert.deepEqual(missingSample.calls, []);
  assert.deepEqual(wrongFolder.calls, []);
});

test('identifies missing S3 settings before creating a database', async () => {
  const { calls, errors, exitCode } = await runLocalTest({ missingS3Credentials: true });
  assert.equal(exitCode, 1);
  assert.deepEqual(calls, []);
  assert.match(errors[0][1].message, /Missing S3 configuration in .*\.env\.local: S3_SECRET_KEY/);
  assert.match(errors[0][1].message, /\.env\.local/);
});

test('S3-compatible upload does not send a trailing checksum with a streamed body', async () => {
  const payload = Buffer.from('sample dump');
  let headers;
  const server = createServer((request, response) => {
    headers = request.headers;
    request.resume();
    request.on('end', () => { response.writeHead(200); response.end(); });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const s3 = new RealS3Client({
    region: 'us-east-1',
    endpoint: `http://127.0.0.1:${server.address().port}`,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  try {
    await s3.send(new RealPutObjectCommand({
      Bucket: 'bucket', Key: 'dump_test/sample', Body: Readable.from([payload]), ContentLength: payload.length,
    }));
    assert.equal(headers['x-amz-trailer'], undefined);
    assert.equal(headers['content-encoding'], undefined);
    assert.equal(headers['content-length'], String(payload.length));
  } finally {
    s3.destroy();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
