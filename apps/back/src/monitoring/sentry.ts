import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as Sentry from '@sentry/nestjs';
import { resolveSourceVersion, SOURCE_VERSION_FILE } from '@shared/release';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export type ProcessType = 'api' | 'worker';
export const SENTRY_SHUTDOWN_TIMEOUT_MS = 2000;

const PROCESS_DSN_ENV_KEYS: Record<ProcessType, 'SENTRY_API_DSN' | 'SENTRY_WORKER_DSN'> = {
  api: 'SENTRY_API_DSN',
  worker: 'SENTRY_WORKER_DSN',
};

export function resolveRelease(env: NodeJS.ProcessEnv, releaseFile = SOURCE_VERSION_FILE): string | undefined {
  // Use console during early instrumentation: importing the application logger
  // would load NestJS before Sentry has initialized.
  const explicit = env.SENTRY_RELEASE?.trim();
  if (explicit) {
    console.info('[Sentry] Release resolved', { source: 'SENTRY_RELEASE', release: explicit });
    return explicit;
  }
  if (!env.SOURCE_VERSION?.trim()) {
    console.info('[Sentry] Looking up build release file', {
      cwd: process.cwd(),
      releaseFile: resolve(releaseFile),
      exists: existsSync(releaseFile),
    });
  }
  const sourceVersion = resolveSourceVersion(env, releaseFile);
  if (sourceVersion) {
    console.info('[Sentry] Release resolved', {
      source: env.SOURCE_VERSION?.trim() ? 'SOURCE_VERSION' : SOURCE_VERSION_FILE,
      release: sourceVersion,
    });
    return sourceVersion;
  }
  const containerVersion = env.CONTAINER_VERSION?.trim() || undefined;
  console.warn('[Sentry] Git release unavailable; falling back to CONTAINER_VERSION', {
    release: containerVersion ?? null,
  });
  return containerVersion;
}

export function getSentryOptions(env: NodeJS.ProcessEnv, processType: ProcessType): Sentry.NodeOptions | undefined {
  // Each process targets its own Sentry project: the API reads SENTRY_API_DSN
  // and the worker SENTRY_WORKER_DSN; an empty value disables that process only.
  const dsn = env[PROCESS_DSN_ENV_KEYS[processType]]?.trim();
  if (!dsn) {
    return undefined;
  }

  const rawSampleRate = env.SENTRY_TRACES_SAMPLE_RATE?.trim() || '0.1';
  const tracesSampleRate = Number(rawSampleRate);
  if (!Number.isFinite(tracesSampleRate) || tracesSampleRate < 0 || tracesSampleRate > 1) {
    throw new Error('SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1');
  }

  return {
    dsn,
    integrations: [nodeProfilingIntegration()],
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development',
    release: resolveRelease(env),
    tracesSampleRate,
    // Set sampling rate for profiling - this is evaluated only once per SDK.init call
    profileSessionSampleRate: 1.0,
    // Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: 'trace',
    initialScope: { tags: { process_type: processType }, attributes: { process_type: processType } },
    // Do not propagate monitoring headers to OIDC, S3 or other third parties.
    tracePropagationTargets: [],
    beforeSendLog: () => null,
    maxBreadcrumbs: 0,
    shutdownTimeout: SENTRY_SHUTDOWN_TIMEOUT_MS,
    dataCollection: {
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
    },
    beforeSend(event) {
      // Keep error reporting independent of arbitrary application payloads.
      delete event.user;
      delete event.extra;
      event.breadcrumbs = [];
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
        if (event.request.url) {
          event.request.url = sanitizeUrl(event.request.url);
        }
      }
      return event;
    },
    beforeSendSpan(span) {
      // SQL text is normalized by the SDK's Postgres integration, not removed:
      // query shapes remain available for slow-query and N+1 analysis.
      delete span.attributes['db.connection_string'];
      delete span.attributes['db.user'];
      for (const key of ['url.full', 'http.url', 'http.target']) {
        const value = span.attributes[key];
        if (typeof value === 'string') {
          span.attributes[key] = sanitizeUrl(value);
        }
      }
      return span;
    },
  };
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function initSentry(processType: ProcessType): void {
  loadLocalEnvFiles();
  const options = getSentryOptions(process.env, processType);
  if (options) {
    Sentry.init(options);
    console.info('[Sentry] Initialized', {
      processType,
      environment: options.environment,
      release: options.release ?? null,
    });
  } else {
    console.info('[Sentry] Disabled: process DSN is not configured', {
      processType,
      dsnEnvKey: PROCESS_DSN_ENV_KEYS[processType],
    });
  }
}

/**
 * Deployments inject real environment variables and ship no env files: nothing
 * is loaded there, so the dev-only `dotenv` dependency is never required. In
 * local development the DSN lives in `.env.local`/`.env`, which Nest's
 * `ConfigModule` loads too late for instrumentation. dotenv does not override
 * existing variables, preserving the process environment > `.env.local` >
 * `.env` precedence, relative to the runtime cwd.
 */
function loadLocalEnvFiles(): void {
  if (!existsSync('.env.local') && !existsSync('.env')) {
    return;
  }
  try {
    // dotenv is a development dependency: production installs do not have it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only, guarded by env file existence
    const { config } = require('dotenv') as typeof import('dotenv');
    config({ path: ['.env.local', '.env'], quiet: true });
  } catch {
    // Env files exist without dotenv: initialization relies on the injected
    // environment only.
  }
}
