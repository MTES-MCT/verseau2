import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMock } from '@golevelup/ts-jest';
import type * as Sentry from '@sentry/nestjs';
import { getSentryOptions, resolveRelease } from './sentry';

describe('Sentry configuration', () => {
  const dsn = 'https://public@example.test/1';

  it('is disabled without a process DSN, even if the sampling setting is invalid', () => {
    expect(getSentryOptions({}, 'api')).toBeUndefined();
    expect(
      getSentryOptions({ SENTRY_WORKER_DSN: ' ', SENTRY_TRACES_SAMPLE_RATE: 'invalid' }, 'worker'),
    ).toBeUndefined();
  });

  it('targets a dedicated project per process', () => {
    expect(getSentryOptions({ SENTRY_API_DSN: 'https://api@example.test/2' }, 'api')?.dsn).toBe(
      'https://api@example.test/2',
    );
    expect(getSentryOptions({ SENTRY_WORKER_DSN: 'https://worker@example.test/3' }, 'worker')?.dsn).toBe(
      'https://worker@example.test/3',
    );
  });

  it('ignores the other process DSN and the shared SENTRY_DSN variable', () => {
    expect(getSentryOptions({ SENTRY_WORKER_DSN: 'https://worker@example.test/3' }, 'api')).toBeUndefined();
    expect(getSentryOptions({ SENTRY_DSN: dsn }, 'api')).toBeUndefined();
    expect(getSentryOptions({ SENTRY_DSN: dsn }, 'worker')).toBeUndefined();
  });

  it('defaults to 10% tracing and identifies the process', () => {
    expect(getSentryOptions({ SENTRY_API_DSN: dsn }, 'api')).toMatchObject({
      dsn,
      environment: 'development',
      tracesSampleRate: 0.1,
      initialScope: { tags: { process_type: 'api' } },
      tracePropagationTargets: [],
    });
  });

  it.each(['0', '0.25', '1'])('accepts sampling rate %s', (rate) => {
    expect(
      getSentryOptions({ SENTRY_WORKER_DSN: dsn, SENTRY_TRACES_SAMPLE_RATE: rate }, 'worker')?.tracesSampleRate,
    ).toBe(Number(rate));
  });

  it.each(['-0.1', '1.1', 'NaN', 'Infinity', 'invalid'])('rejects sampling rate %s', (rate) => {
    expect(() => getSentryOptions({ SENTRY_API_DSN: dsn, SENTRY_TRACES_SAMPLE_RATE: rate }, 'api')).toThrow(
      'SENTRY_TRACES_SAMPLE_RATE',
    );
  });

  it('sets environment and release independently of the frontend', () => {
    expect(
      getSentryOptions(
        { SENTRY_WORKER_DSN: dsn, SENTRY_ENVIRONMENT: 'recette', SENTRY_RELEASE: 'verseau@123' },
        'worker',
      ),
    ).toMatchObject({
      environment: 'recette',
      release: 'verseau@123',
      initialScope: { tags: { process_type: 'worker' } },
    });
    expect(getSentryOptions({ SENTRY_API_DSN: dsn, NODE_ENV: 'production' }, 'api')?.environment).toBe('production');
  });

  describe('release resolution', () => {
    it('prefers the explicit SENTRY_RELEASE variable over every other source', () => {
      expect(
        resolveRelease(
          { SENTRY_RELEASE: 'explicit-release', CONTAINER_VERSION: 'deployment-id' },
          '/nonexistent/.release',
        ),
      ).toBe('explicit-release');
    });

    it('reads the .release file written during a build', () => {
      const dir = mkdtempSync(join(tmpdir(), 'sentry-release-'));
      const file = join(dir, '.release');
      writeFileSync(file, '  5f2d9c43a1b7e8d0 \n');
      try {
        expect(resolveRelease({ CONTAINER_VERSION: 'deployment-id' }, file)).toBe('5f2d9c43a1b7e8d0');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('uses a runtime-injected SOURCE_VERSION when the platform provides one', () => {
      expect(resolveRelease({ SOURCE_VERSION: 'runtime-commit' }, '/nonexistent/.release')).toBe('runtime-commit');
      const dir = mkdtempSync(join(tmpdir(), 'sentry-release-'));
      const file = join(dir, '.release');
      writeFileSync(file, 'build-commit\n');
      try {
        expect(resolveRelease({ SOURCE_VERSION: 'runtime-commit', CONTAINER_VERSION: 'deployment-id' }, file)).toBe(
          'runtime-commit',
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('falls back to the runtime-injected CONTAINER_VERSION', () => {
      expect(resolveRelease({ CONTAINER_VERSION: 'deployment-id' }, '/nonexistent/.release')).toBe('deployment-id');
    });

    it('reports no release when nothing is available', () => {
      expect(resolveRelease({}, '/nonexistent/.release')).toBeUndefined();
      expect(getSentryOptions({ SENTRY_API_DSN: dsn }, 'api')?.release).toBeUndefined();
    });
  });

  it('explicitly opts out of sensitive SDK v11 collection defaults', () => {
    expect(getSentryOptions({ SENTRY_API_DSN: dsn }, 'api')?.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    });
  });

  it('removes payloads and credentials from error events', async () => {
    const options = getSentryOptions({ SENTRY_API_DSN: dsn }, 'api')!;
    const event: Sentry.ErrorEvent = {
      type: undefined,
      user: { email: 'private@example.test' },
      extra: { xml: '<private />' },
      breadcrumbs: [{ message: 'private' }],
      request: {
        url: 'https://user:password@example.test/api/depot?token=secret#private',
        data: '<private />',
        cookies: { access_token: 'secret' },
        headers: { authorization: 'secret' },
        query_string: 'token=secret',
      },
    };
    const result = await options.beforeSend!(event, {});
    expect(result).toEqual({ breadcrumbs: [], request: { url: 'https://example.test/api/depot' } });
  });

  it('keeps normalized SQL while removing connection details and URL parameters', () => {
    const options = getSentryOptions({ SENTRY_API_DSN: dsn }, 'api')!;
    const span = createMock<Parameters<NonNullable<Sentry.NodeOptions['beforeSendSpan']>>[0]>({
      attributes: {
        'db.query.text': 'SELECT * FROM depot WHERE id = $1',
        'db.connection_string': 'postgres://user:password@host/database',
        'db.user': 'user',
        'url.full': 'https://user:password@example.test/api?token=secret',
        'http.target': '/api?token=secret',
      },
    });
    expect(options.beforeSendSpan!(span).attributes).toEqual({
      'db.query.text': 'SELECT * FROM depot WHERE id = $1',
      'url.full': 'https://example.test/api',
      'http.target': '/api',
    });
  });
});
