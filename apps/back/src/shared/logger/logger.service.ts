import { Injectable, Scope } from '@nestjs/common';
import { ConsoleLogger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  constructor(context: string) {
    super(context);
  }
  log(message: any, ...optionalParams: [...any, string?]): void {
    super.log(message, ...optionalParams);
  }
  customLog() {
    this.log('A custom log');
  }
}
