import * as Sentry from '@sentry/react';
import { APP_ENV, SENTRY_DSN, SENTRY_RELEASE } from '../appConfig';
import { ApiError } from '../api/apiError';

let isSentryEnabled = false;

const ignoredApiStatuses = new Set([400, 401, 403, 404]);

export function initSentry() {
  if (!SENTRY_DSN) {
    return;
  }

  const options: Parameters<typeof Sentry.init>[0] = {
    dsn: SENTRY_DSN,
    environment: APP_ENV || undefined,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  };

  if (SENTRY_RELEASE) {
    options.release = SENTRY_RELEASE;
  }

  Sentry.init(options);
  isSentryEnabled = true;
}

export function shouldReportError(error: unknown) {
  return !(error instanceof ApiError && ignoredApiStatuses.has(error.status));
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!shouldReportError(error)) {
    return;
  }

  if (!isSentryEnabled) {
    console.error(error, context);
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function setSentryUser(user: Sentry.User | null) {
  if (!isSentryEnabled) {
    return;
  }
  Sentry.setUser(user);
}

export function getIsSentryEnabled() {
  return isSentryEnabled;
}
