/* eslint-disable @typescript-eslint/no-explicit-any , @typescript-eslint/no-unsafe-argument */
import { Injectable, Optional, Scope } from '@nestjs/common';
import { ConsoleLogger } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { CustomClsStore } from './cls-store.interface';
import { getLogLevels } from './logConfig';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  constructor(@Optional() context?: string) {
    super(context ?? '');
    const logs = getLogLevels();
    if (logs) {
      this.setLogLevels(logs);
    }
  }

  protected getTimestamp(): string {
    if (process.env.TIMESTAMP_LOGGING === 'true') {
      return super.getTimestamp();
    }
    return '';
  }

  log(message: any, ...optionalParams: [...any, string?]): void {
    const logMessage = this.formatArgs(message, ...optionalParams);
    super.log(logMessage);
  }

  warn(message: any, ...optionalParams: [...any, string?]): void {
    const warnMessage = this.formatArgs(message, ...optionalParams);
    super.warn(warnMessage);
  }

  error(message: any, ...optionalParams: [...any, string?]): void {
    const errorMessage = this.formatArgs(message, ...optionalParams);
    super.error(errorMessage);
  }

  debug(message: any, ...optionalParams: [...any, string?]): void {
    const debugMessage = this.formatArgs(message, ...optionalParams);
    super.debug(debugMessage);
  }

  verbose(message: any, ...optionalParams: [...any, string?]): void {
    super.verbose(this.formatArgs(message, ...optionalParams));
  }

  fatal(message: any, ...optionalParams: [...any, string?]): void {
    super.fatal(this.formatArgs(message, ...optionalParams));
  }

  formatArgs(message: any, ...optionalParams: [...any, string?]): string {
    const cls = ClsServiceManager.getClsService<CustomClsStore>();
    const correlationId = cls?.get('correlationId');
    const prefix = correlationId ? `[cid: ${correlationId}] ` : '';

    let formattedMessage = `${prefix}${typeof message === 'string' ? message : this.serialize(message)}`;
    if (optionalParams.length > 0) {
      const separator = ' - ';
      formattedMessage += `${separator}${optionalParams.map((param) => this.serialize(param)).join(separator)}`;
    }
    return formattedMessage;
  }

  private serialize(value: unknown): string {
    const seen = new WeakSet<object>();
    try {
      return (
        JSON.stringify(value, function (this: Record<string, unknown>, key: string, item: unknown): unknown {
          if (typeof item === 'bigint') {
            return item.toString();
          }
          // JSON.stringify calls toJSON before the replacer (e.g. AxiosError.toJSON).
          // Inspect the original value so client config never becomes part of an Error log.
          const originalItem = this[key];
          if (originalItem instanceof Error) {
            item = originalItem;
          }
          if (item && typeof item === 'object') {
            if (seen.has(item)) {
              return '[Circular]';
            }
            seen.add(item);
            if (item instanceof Error) {
              // Do not serialize HTTP clients' config/request/response (credentials, XML, etc.).
              return { name: item.name, message: item.message, stack: item.stack, cause: item.cause };
            }
          }
          return item;
        }) ?? String(value)
      );
    } catch {
      // Logging must not hide the original failure or interrupt a successful operation.
      return '[Unserializable]';
    }
  }
}
