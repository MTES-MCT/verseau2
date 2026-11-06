import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { getPostgresConnectionUri, startPostgresContainer, stopPostgresContainer } from '../testcontainer.config';

describe('Sentry APM (isolated Node runtime)', () => {
  beforeAll(async () => {
    await startPostgresContainer();
  });

  afterAll(async () => {
    await stopPostgresContainer();
  });

  it('captures HTTP and worker SQL, propagates traces and retries, isolates jobs and excludes sensitive data', async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', path.join(__dirname, 'fixtures/sentry-smoke.ts')],
      {
        cwd: path.resolve(__dirname, '../..'),
        env: {
          ...process.env,
          DATABASE_URL: getPostgresConnectionUri(),
          SENTRY_API_DSN: '',
          SENTRY_WORKER_DSN: '',
          NODE_ENV: 'test',
        },
        timeout: 45000,
      },
    );
    const result = JSON.parse(stdout.trim()) as { sqlSpans: number; workerSpans: number; httpSpans: number };
    expect(result.sqlSpans).toBeGreaterThanOrEqual(6);
    expect(result.workerSpans).toBe(4);
    expect(result.httpSpans).toBeGreaterThanOrEqual(4);
  });
});
