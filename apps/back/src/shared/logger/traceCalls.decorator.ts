/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return*/

import { Logger, LogLevel } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { ulid } from 'ulid';
import { LoggerService } from './logger.service';

function bufferLine(logLines: string[], callIdPrefix: string, msg: string) {
  logLines.push(`${callIdPrefix}${msg}`);
}

function flush(logLines: string[], logger: LoggerService, level: LogLevel) {
  const logMethod = logger[level as keyof Logger] as (msg: string) => void;
  if (typeof logMethod === 'function') {
    logLines.forEach((line) => logMethod.call(logger, line));
  } else {
    logLines.forEach((line) => logger.log(line));
  }
}

function flushError(logLines: string[], logger: LoggerService, callIdPrefix: string, errorMsg: string) {
  logLines.push(`${callIdPrefix} ${errorMsg}`);
  logLines.forEach((line) => logger.error(line));
}

/**
 * Decorator that logs all method calls made within the decorated method.
 * It uses a Proxy to intercept property access on 'this'.
 * All log lines are buffered and flushed sequentially at the end of execution
 * to reduce interleaving with other concurrent logs.
 *
 * @param level The log level to use (default: 'debug')
 */
export function TraceCalls(level: LogLevel = 'debug'): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const className = target.constructor.name;
    const callIdPrefix = `[callId: ${ulid().substring(20, 25).toLowerCase()}]`;

    descriptor.value = function (this: Record<string, unknown>, ...args: unknown[]) {
      const logger = new LoggerService(className);
      const propName = String(propertyKey);
      const startTime = performance.now();

      const logLines: string[] = [];

      bufferLine(logLines, callIdPrefix, `>>> [START] ${propName}`);

      // Create a proxy of 'this' to intercept calls to other methods or services
      const proxy = new Proxy(this, {
        get(targetProxy, prop, receiver) {
          const value = Reflect.get(targetProxy, prop, receiver) as unknown;

          // If it's a function on the same instance (except the current method to avoid infinite loops)
          if (typeof value === 'function' && prop !== propertyKey) {
            return (...subArgs: unknown[]) => {
              const subStart = performance.now();
              const result = (value as (...args: unknown[]) => unknown).apply(receiver as object, subArgs);

              if (result instanceof Promise) {
                return result.finally(() => {
                  const duration = (performance.now() - subStart).toFixed(2);
                  bufferLine(logLines, callIdPrefix, `    [INTERNAL CALL] this.${String(prop)}() - ${duration}ms`);
                });
              }

              const duration = (performance.now() - subStart).toFixed(2);
              bufferLine(logLines, callIdPrefix, `    [INTERNAL CALL] this.${String(prop)}() - ${duration}ms`);
              return result;
            };
          }

          // If it's an injected service or any object property (excluding logger and internal NestJS props)
          if (
            value &&
            typeof value === 'object' &&
            prop !== 'logger' &&
            typeof prop === 'string' &&
            !prop.startsWith('_') &&
            !Array.isArray(value)
          ) {
            return new Proxy(value, {
              get(targetSub, propSub, receiverSub) {
                const subValue = Reflect.get(targetSub, propSub, receiverSub) as unknown;
                if (typeof subValue === 'function') {
                  return (...subArgs: unknown[]) => {
                    const subStart = performance.now();
                    const result = (subValue as (...args: unknown[]) => unknown).apply(targetSub, subArgs);

                    if (result instanceof Promise) {
                      return result.finally(() => {
                        const duration = (performance.now() - subStart).toFixed(2);
                        bufferLine(
                          logLines,
                          callIdPrefix,
                          `    [SERVICE CALL] ${String(prop)}.${String(propSub)}() - ${duration}ms`,
                        );
                      });
                    }

                    const duration = (performance.now() - subStart).toFixed(2);
                    bufferLine(
                      logLines,
                      callIdPrefix,
                      `    [SERVICE CALL] ${String(prop)}.${String(propSub)}() - ${duration}ms`,
                    );
                    return result;
                  };
                }
                return subValue;
              },
            });
          }

          return value;
        },
      });

      try {
        const result = originalMethod.apply(proxy, args);

        if (result instanceof Promise) {
          return result
            .then((res: unknown) => {
              const duration = (performance.now() - startTime).toFixed(2);
              bufferLine(logLines, callIdPrefix, `<<< [END] ${propName} | Duration: ${duration}ms `);
              flush(logLines, logger, level);
              return res;
            })
            .catch((err: Error) => {
              const duration = (performance.now() - startTime).toFixed(2);
              flushError(
                logLines,
                logger,
                callIdPrefix,
                `!!! [ERROR] ${propName} | Duration: ${duration}ms | ${err.message}`,
              );
              throw err;
            });
        }

        const duration = (performance.now() - startTime).toFixed(2);
        bufferLine(logLines, callIdPrefix, `<<< [END] ${propName} | Duration: ${duration}ms`);
        flush(logLines, logger, level);
        return result;
      } catch (err) {
        const duration = (performance.now() - startTime).toFixed(2);
        const message = err instanceof Error ? err.message : String(err);
        flushError(logLines, logger, callIdPrefix, `!!! [ERROR] ${propName} | Duration: ${duration}ms | ${message}`);
        throw err;
      }
    };

    return descriptor;
  };
}
