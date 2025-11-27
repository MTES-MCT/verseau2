/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Scope } from '@nestjs/common';
import { ConsoleLogger } from '@nestjs/common';
import { getLogLevels } from './logConfig';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  constructor(context: string) {
    super(context);
    const logs = getLogLevels();
    if (logs) {
      this.setLogLevels(logs);
    }
  }

  // protected getTimestamp(): string {
  //   return super.getTimestamp();
  // }

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
    let formattedMessage = `${message}`;
    if (optionalParams.length > 0) {
      const separator = ' - ';
      formattedMessage += `${separator}${optionalParams.map((param) => JSON.stringify(param)).join(separator)}`;
    }
    return formattedMessage;
  }
}
