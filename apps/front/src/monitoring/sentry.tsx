/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { APP_ENV, SENTRY_DSN, SENTRY_RELEASE } from '../appConfig';
import { ApiError } from '../api/apiClient';

let isSentryEnabled = false;

const ignoredApiStatuses = new Set([400, 401, 403, 404]);

export function initSentry() {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV || undefined,
    release: SENTRY_RELEASE || undefined,
  });
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

export function reportMessage(message: string, context?: Record<string, unknown>) {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.captureMessage(message, context ? { extra: context } : undefined);
}

export function setSentryUser(user: { id?: string; username?: string; email?: string } | null) {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.setUser(user);
}

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  if (!isSentryEnabled) {
    return <>{children}</>;
  }

  return <Sentry.ErrorBoundary fallback={<p>Une erreur inattendue est survenue.</p>}>{children}</Sentry.ErrorBoundary>;
}
