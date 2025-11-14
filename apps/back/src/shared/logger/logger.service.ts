import { Injectable, Scope } from '@nestjs/common';
import { ConsoleLogger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  constructor(context: string) {
    super(context);
  }
  log(message: any, ...optionalParams: [...any, string?]): void {
    let logMessage = `${message}`;
    if (optionalParams.length > 0) {
      const separator = ' - ';
      logMessage += `${separator}${optionalParams.map((param) => JSON.stringify(param)).join(separator)}`;
    }
    super.log(logMessage);
  }

  error(message: any, ...optionalParams: [...any, string?, string?]): void {
    let errorMessage = `${message}`;
    if (optionalParams.length > 0) {
      const separator = ' - ';
      errorMessage += `${separator}${optionalParams.map((param) => JSON.stringify(param)).join(separator)}`;
    }
    super.error(errorMessage);
  }

  customLog() {
    this.log('A custom log');
  }
}
