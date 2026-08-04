import type { ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { getIsSentryEnabled } from './sentry';

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  if (!getIsSentryEnabled()) {
    return <>{children}</>;
  }

  return <Sentry.ErrorBoundary fallback={<p>Une erreur inattendue est survenue.</p>}>{children}</Sentry.ErrorBoundary>;
}
