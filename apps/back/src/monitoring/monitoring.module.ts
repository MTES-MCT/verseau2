import { Module, OnApplicationShutdown } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { SENTRY_SHUTDOWN_TIMEOUT_MS } from './sentry';

export class SentryShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // onModuleDestroy has already stopped pg-boss and its active handlers.
    if (Sentry.isInitialized()) {
      await Sentry.close(SENTRY_SHUTDOWN_TIMEOUT_MS).catch(() => undefined);
    }
  }
}

@Module({
  imports: Sentry.isInitialized() ? [SentryModule.forRoot()] : [],
  providers: Sentry.isInitialized()
    ? [SentryShutdownService, { provide: APP_FILTER, useClass: SentryGlobalFilter }]
    : [],
})
export class MonitoringModule {}
