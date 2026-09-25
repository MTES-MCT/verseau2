import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createConnection, createServer } from 'node:net';

const root = resolve(import.meta.dirname, '../..');
const e2e = resolve(root, 'e2e');
const back = resolve(root, 'apps/back');
const project = `verseau-e2e-${process.pid}`;
const open = process.argv.includes('--open');
const compose = ['compose', '-p', project, '-f', resolve(e2e, 'infrastructure/docker-compose.yml')];
const databaseUrl = 'postgresql://postgres:postgres@localhost:54329/verseau_e2e';

mkdirSync(resolve(e2e, 'artifacts/logs'), { recursive: true });

const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: databaseUrl,
  DATABASE_POOL_API: '5',
  DATABASE_POOL_WORKER: '5',
  DDL_SYNC: 'true',
  RUN_MIGRATIONS_ON_STARTUP: 'false',
  QUEUE_PREFIX: project,
  S3_PROVIDER: 'mock',
  S3_BUCKET: 'verseau-e2e',
  S3_ENDPOINT: 'http://localhost:9099',
  S3_REGION: 'eu-west-1',
  S3_ACCESS_KEY: 'e2e',
  S3_SECRET_KEY: 'e2e',
  EMAIL_PROVIDER: 'mock',
  SFTP_PROVIDER: 'mock',
  SFTP_AGENCY_PROVIDER: 'mock',
  USE_SANDRE_MOCK: 'true',
  SANDRE_MOCK_BEHAVIOR: 'conformant',
  OIDC_MOCK: 'true',
  OIDC_MOCK_EMAIL: 'e2e@example.com',
  JWT_SECRET: 'e2e-only-secret-with-at-least-32-characters',
  CORS_ORIGIN: 'http://localhost:5173',
  PORT: '3000',
  VITE_API_BASE_URL: 'http://localhost:3000/api',
  VITE_BASE_PATH: '/',
  VITE_SENTRY_DSN: '',
};

const children = new Set();
let stopping = false;
let startedCompose = false;

function start(command, args, cwd, label, extraEnv = {}) {
  const child = spawn(command, args, { cwd, env: { ...env, ...extraEnv }, stdio: ['inherit', 'pipe', 'pipe'] });
  children.add(child);
  const log = createWriteStream(resolve(e2e, `artifacts/logs/${label}.log`));
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  if (['api', 'worker', 'vite', 'cypress'].includes(label)) {
    child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
    child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  }
  child.on('error', (error) => console.error(`${label}: ${error.message}`));
  child.on('close', () => {
    children.delete(child);
    log.end();
  });
  return child;
}

async function run(command, args, cwd, label, extraEnv) {
  console.log(`[e2e] ${label}`);
  const child = start(command, args, cwd, label, extraEnv);
  const code = await new Promise((done) => child.once('close', done));
  if (code !== 0) {
    const logPath = resolve(e2e, `artifacts/logs/${label}.log`);
    const output = readFileSync(logPath, 'utf8').trim().split('\n').slice(-30).join('\n');
    throw new Error(`${label} exited with code ${code}. See ${logPath}\n${output}`);
  }
}

async function waitFor(url, label, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null) {
      throw new Error(`${label} exited early. See e2e/artifacts/logs/${label}.log`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok || (label === 'api' && response.status === 401)) {
        return;
      }
    } catch { /* Service not ready. */ }
    await delay(1000);
  }
  throw new Error(`Timed out waiting for ${label}: ${url}`);
}

async function waitForPort(port, label) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const connected = await new Promise((done) => {
      const socket = createConnection({ host: '127.0.0.1', port });
      socket.setTimeout(1500);
      socket.once('connect', () => { socket.destroy(); done(true); });
      socket.once('error', () => done(false));
      socket.once('timeout', () => { socket.destroy(); done(false); });
    });
    if (connected) {
      return;
    }
    await delay(1000);
  }
  throw new Error(
    `Docker reports ${label} as running, but the test runner cannot reach 127.0.0.1:${port}. ` +
      'The backend has not started. Run this command on the Docker host or restore Docker published-port forwarding.',
  );
}

async function assertPortFree(port, label) {
  await new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.once('error', (error) => {
      rejectPort(new Error(`Port ${port} is already in use; stop the existing ${label} before running E2E`, { cause: error }));
    });
    server.listen(port, '0.0.0.0', () => server.close(resolvePort));
  });
}

async function stop() {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
  await delay(1500);
  for (const child of children) {
    child.kill('SIGKILL');
  }
  if (startedCompose) {
    console.log('[e2e] Stopping Docker services');
    await run('docker', [...compose, 'down', '-v', '--remove-orphans'], e2e, 'compose-down');
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { void stop().finally(() => { process.exitCode = 130; }); });
}

try {
  await assertPortFree(3000, 'backend API');
  await assertPortFree(5173, 'frontend');
  startedCompose = true;
  await run('docker', [...compose, 'up', '-d', '--wait'], e2e, 'compose-up');
  console.log('[e2e] Waiting for PostgreSQL and S3 host ports');
  await waitForPort(54329, 'postgres');
  await waitForPort(9099, 's3');
  await run('pnpm', ['--filter', 'back', 'build'], root, 'build-back');
  await run('node', ['--import', 'tsx', 'fixtures/database/seed.mjs', 'schemas'], e2e, 'seed-schemas');

  console.log('[e2e] Starting backend API');
  const api = start('node', ['dist/mainServer.js'], back, 'api', { PROCESS_TYPE: 'api' });
  await waitFor('http://localhost:3000/api/version', 'api', api);
  console.log('[e2e] Backend API is ready');
  await run('node', ['--import', 'tsx', 'fixtures/database/seed.mjs', 'user'], e2e, 'seed-user');

  console.log('[e2e] Starting backend worker');
  const worker = start('node', ['dist/mainWorker.js'], back, 'worker', { PROCESS_TYPE: 'worker' });
  // A worker has no HTTP endpoint; its startup log signals that subscriptions are installed.
  const workerLog = resolve(e2e, 'artifacts/logs/worker.log');
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (worker.exitCode !== null) {
      throw new Error(`Worker exited early. See ${workerLog}`);
    }
    if (readFileSync(workerLog, 'utf8').includes('Nest application successfully started')) {
      break;
    }
    await delay(1000);
  }
  if (Date.now() >= deadline) {
    throw new Error(`Timed out waiting for worker. See ${workerLog}`);
  }
  console.log('[e2e] Backend worker is ready');

  const vite = start('pnpm', ['--filter', 'front', 'dev', '--host', '0.0.0.0', '--strictPort'], root, 'vite');
  await waitFor('http://localhost:5173/', 'vite', vite);

  await run('pnpm', ['exec', 'cypress', open ? 'open' : 'run'], e2e, 'cypress');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await stop();
}
