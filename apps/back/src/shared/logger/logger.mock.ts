/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { ConsoleLogger } from '@nestjs/common';
import { LoggerService } from './logger.service';

export const loggerValueMock = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
};

export const loggerProviderMock = {
  provide: LoggerService,
  useValue: loggerValueMock,
};

export class LoggerServiceMock extends LoggerService {
  constructor() {
    super('LoggerServiceMock');
  }

  log(message: any, ...optionalParams: [...any, string?]): void {
    // Mock implementation
  }

  error(message: any, ...optionalParams: [...any, string?]): void {
    // Mock implementation
  }

  debug(message: any, ...optionalParams: [...any, string?]): void {
    // Mock implementation
  }

  formatArgs(message: any, ...optionalParams: [...any, string?]): string {
    return '';
  }

  protected getTimestamp(): string {
    return '';
  }
}
