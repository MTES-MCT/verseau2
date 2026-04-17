/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'typeorm';
import { LoggerService } from '@shared/logger/logger.service';

export class TypeOrmLogger implements Logger {
  private readonly logger = new LoggerService('TypeORM');

  logQuery(query: string, parameters?: any[]) {
    this.logger.debug(
      `Query: ${query}${parameters && parameters.length ? ' -- Parameters: ' + JSON.stringify(parameters)?.substring(0, 200) : ''}`,
    );
    // this.logger.debug(`Query: ${query.substring(0, 120)}`);
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    this.logger.error(
      `Query Error: ${error} -- Query: ${query}${parameters && parameters.length ? ' -- Parameters: ' + JSON.stringify(parameters) : ''}`,
    );
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    this.logger.warn(
      `Query Slow (${time}ms): ${query}${parameters && parameters.length ? ' -- Parameters: ' + JSON.stringify(parameters) : ''}`,
    );
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
