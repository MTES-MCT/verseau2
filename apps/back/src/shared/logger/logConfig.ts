import { LogLevel } from '@nestjs/common';

export function getLogLevels(): LogLevel[] {
  const levels: LogLevel[] = ['error', 'warn', 'log'];
  if (process.env.LOGS_LEVEL === 'verbose') {
    levels.push('debug', 'verbose');
  }
  if (process.env.LOGS_LEVEL === 'debug') {
    levels.push('debug');
  }

  return levels;
}
