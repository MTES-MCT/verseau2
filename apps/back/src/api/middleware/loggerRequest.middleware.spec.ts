import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import type { CustomRequest } from '@shared/constants/customRequest';
import { LoggerService } from '@shared/logger/logger.service';
import { LoggerRequestMiddleware } from './loggerRequest.middleware';

describe('LoggerRequestMiddleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [200, 'log'],
    [302, 'log'],
    [400, 'warn'],
    [401, 'warn'],
    [403, 'warn'],
    [404, 'warn'],
    [500, 'error'],
    [503, 'error'],
  ] as const)('logs HTTP %s at %s level without query parameters', (statusCode, level) => {
    const logger = new LoggerService('test');
    const log = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const middleware = new LoggerRequestMiddleware(logger);
    const req = { method: 'GET', originalUrl: '/api/auth/callback?code=sensitive', ip: '127.0.0.1' } as CustomRequest;
    const res = Object.assign(new EventEmitter(), { statusCode });
    const next = jest.fn();

    middleware.use(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    res.emit('finish');

    const spies = { log, warn, error };
    expect(spies[level]).toHaveBeenCalledTimes(1);
    expect(spies[level]).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        path: '/api/auth/callback',
        statusCode,
      }),
    );
    expect(JSON.stringify(spies[level].mock.calls)).not.toContain('sensitive');
    expect(log.mock.calls.length + warn.mock.calls.length + error.mock.calls.length).toBe(1);
  });
});
