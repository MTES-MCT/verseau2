/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return*/

import { Logger, LogLevel } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { ulid } from 'ulid';
import { LoggerService } from './logger.service';
//
/**
 * Decorator that logs all method calls made within the decorated method.
 * It uses a Proxy to intercept property access on 'this'.
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

      const log = (msg: string) => {
        const logMethod = logger[level as keyof Logger] as (msg: string) => void;
        if (typeof logMethod === 'function') {
          logMethod.call(logger, `${callIdPrefix}${msg}`);
        } else {
          logger.log(`${callIdPrefix}${msg}`);
        }
      };

      const logError = (msg: string) => {
        logger.error(`${callIdPrefix} ${msg}`);
      };

      log(`>>> [START] ${propName}`);

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
                  log(`    [INTERNAL CALL] this.${String(prop)}() - ${duration}ms`);
                });
              }

              const duration = (performance.now() - subStart).toFixed(2);
              log(`    [INTERNAL CALL] this.${String(prop)}() - ${duration}ms`);
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
                        log(`    [SERVICE CALL] ${String(prop)}.${String(propSub)}() - ${duration}ms`);
                      });
                    }

                    const duration = (performance.now() - subStart).toFixed(2);
                    log(`    [SERVICE CALL] ${String(prop)}.${String(propSub)}() - ${duration}ms`);
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
              log(`<<< [END] ${propName} | Duration: ${duration}ms `);
              return res;
            })
            .catch((err: Error) => {
              const duration = (performance.now() - startTime).toFixed(2);
              logError(`!!! [ERROR] ${propName} | Duration: ${duration}ms | ${err.message}`);
              throw err;
            });
        }

        const duration = (performance.now() - startTime).toFixed(2);
        log(`<<< [END] ${propName} | Duration: ${duration}ms`);
        return result;
      } catch (err) {
        const duration = (performance.now() - startTime).toFixed(2);
        const message = err instanceof Error ? err.message : String(err);
        logError(`!!! [ERROR] ${propName} | Duration: ${duration}ms | ${message}`);
        throw err;
      }
    };

    return descriptor;
  };
}
