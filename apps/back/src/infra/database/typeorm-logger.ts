/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'typeorm';
import { LoggerService } from '@shared/logger/logger.service';

export class TypeOrmLogger implements Logger {
  private readonly logger = new LoggerService('TypeORM');

  private formatQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim();
  }

  logQuery(query: string, parameters?: any[]) {
    this.logger.debug('Query', {
      query: this.formatQuery(query.substring(0, 600)),
      parameterCount: parameters?.length ?? 0,
    });
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    // Preserve SQL failure diagnostics even when debug logging is disabled.
    this.logger.error('Query failed', {
      error,
      query: this.formatQuery(query.substring(0, 600)),
      parameterCount: parameters?.length ?? 0,
    });
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    this.logger.warn('Slow query', {
      time,
      query: this.formatQuery(query.substring(0, 600)),
      parameterCount: parameters?.length ?? 0,
    });
  }

  logSchemaBuild(message: string) {
    this.logger.log(`Schema Build: ${message}`);
  }

  logMigration(message: string) {
    this.logger.log(`Migration: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    switch (level) {
      case 'log':
      case 'info':
        this.logger.log(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
    }
  }
}
