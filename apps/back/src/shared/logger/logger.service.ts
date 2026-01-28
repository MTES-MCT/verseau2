/* eslint-disable @typescript-eslint/no-explicit-any , @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { ConsoleLogger } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { CustomClsStore } from './cls-store.interface';
import { getLogLevels } from './logConfig';

@Injectable()
export class LoggerService extends ConsoleLogger {
  constructor(context: string) {
    super(context);
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

  error(message: any, ...optionalParams: [...any, string?]): void {
    const errorMessage = this.formatArgs(message, ...optionalParams);
    super.error(errorMessage);
  }

  debug(message: any, ...optionalParams: [...any, string?]): void {
    const debugMessage = this.formatArgs(message, ...optionalParams);
    super.debug(debugMessage);
  }

  formatArgs(message: any, ...optionalParams: [...any, string?]): string {
    const cls = ClsServiceManager.getClsService<CustomClsStore>();
    const correlationId = cls?.get('correlationId');
    const prefix = correlationId ? `[cid: ${correlationId}] ` : '';

    let formattedMessage = `${prefix}${message}`;
    if (optionalParams.length > 0) {
      const separator = ' - ';
      formattedMessage += `${separator}${optionalParams.map((param) => JSON.stringify(param)).join(separator)}`;
    }
    return formattedMessage;
  }
}
