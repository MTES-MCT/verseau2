import { existsSync, readFileSync } from 'node:fs';
import * as Sentry from '@sentry/nestjs';
import { config } from 'dotenv';
import { initSentry } from './sentry';
import { SentryShutdownService } from './monitoring.module';

jest.mock('@sentry/nestjs', () => {
  const { createMock } = jest.requireActual<typeof import('@golevelup/ts-jest')>('@golevelup/ts-jest');
  return createMock<typeof import('@sentry/nestjs')>();
});
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('node:fs', () => {
  const actual = jest.requireActual<typeof import('node:fs')>('node:fs');
  return { ...actual, existsSync: jest.fn(), readFileSync: jest.fn() };
});

describe('Sentry lifecycle', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  it('loads local env files before initializing the SDK', () => {
    jest.mocked(existsSync).mockReturnValue(true);
    jest.mocked(readFileSync).mockReturnValue(' test-build-commit \n');
    jest.mocked(config).mockImplementation(() => {
      process.env.SENTRY_WORKER_DSN = 'https://public@example.test/1';
      return {};
    });
    initSentry('worker');
    expect(config).toHaveBeenCalledWith({ path: ['.env.local', '.env'], quiet: true });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.test/1',
        release: 'test-build-commit',
        initialScope: { tags: { process_type: 'worker' }, attributes: { process_type: 'worker' } },
      }),
    );
    expect(console.info).toHaveBeenCalledWith('[Sentry] Initialized', {
      processType: 'worker',
      environment: 'development',
      release: 'test-build-commit',
    });
  });

  it('initializes from injected variables without loading env files on deployments', () => {
    jest.mocked(existsSync).mockReturnValue(false);
    process.env.SENTRY_API_DSN = 'https://public@example.test/1';
    initSentry('api');
    expect(config).not.toHaveBeenCalled();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'https://public@example.test/1' }));
  });

  it('does not initialize or close a client without a DSN', async () => {
    jest.mocked(existsSync).mockReturnValue(false);
    initSentry('api');
    jest.mocked(Sentry.isInitialized).mockReturnValue(false);
    await new SentryShutdownService().onApplicationShutdown();
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(config).not.toHaveBeenCalled();
    expect(Sentry.close).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('[Sentry] Disabled: process DSN is not configured', {
      processType: 'api',
      dsnEnvKey: 'SENTRY_API_DSN',
    });
  });

  it('flushes at shutdown with a finite timeout', async () => {
    jest.mocked(Sentry.isInitialized).mockReturnValue(true);
    jest.mocked(Sentry.close).mockResolvedValue(true);
    await new SentryShutdownService().onApplicationShutdown();
    expect(Sentry.close).toHaveBeenCalledWith(2000);
  });

  it('does not let a failed transport interrupt application shutdown', async () => {
    jest.mocked(Sentry.isInitialized).mockReturnValue(true);
    jest.mocked(Sentry.close).mockRejectedValue(new Error('transport failed'));
    await expect(new SentryShutdownService().onApplicationShutdown()).resolves.toBeUndefined();
  });

  it('keeps booting when env files exist but dotenv is unavailable', () => {
    jest.mocked(existsSync).mockReturnValue(true);
    jest.mocked(config).mockImplementation(() => {
      throw new Error('dotenv is a development dependency and is not installed');
    });
    expect(() => initSentry('api')).not.toThrow();
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
