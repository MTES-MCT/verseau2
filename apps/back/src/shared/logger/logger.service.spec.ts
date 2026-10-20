import { ConsoleLogger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsServiceManager } from 'nestjs-cls';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
      get: jest.fn().mockReturnValue('test-cid'),
    } as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LoggerService,
          useFactory: () => new LoggerService('TestContext'),
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('formats args without optional params', () => {
    const formatted = service.formatArgs('message');
    expect(formatted).toBe('[cid: test-cid] message');
  });

  it('formats args with optional params', () => {
    const formatted = service.formatArgs('message', { a: 1 }, 'extra');
    expect(formatted).toBe('[cid: test-cid] message - {"a":1} - "extra"');
  });

  it('delegates log with formatted message', () => {
    const spy = jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => undefined);
    service.log('hello', { a: 1 });
    expect(spy).toHaveBeenCalledWith('[cid: test-cid] hello - {"a":1}');
  });

  it('delegates warn with formatted message', () => {
    const spy = jest.spyOn(ConsoleLogger.prototype, 'warn').mockImplementation(() => undefined);
    service.warn('hello', { a: 1 });
    expect(spy).toHaveBeenCalledWith('[cid: test-cid] hello - {"a":1}');
  });

  it('delegates error with formatted message', () => {
    const spy = jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => undefined);
    service.error('oops', { reason: 'fail' });
    expect(spy).toHaveBeenCalledWith('[cid: test-cid] oops - {"reason":"fail"}');
  });

  it('delegates debug with formatted message', () => {
    const spy = jest.spyOn(ConsoleLogger.prototype, 'debug').mockImplementation(() => undefined);
    service.debug('dbg', 42);
    expect(spy).toHaveBeenCalledWith('[cid: test-cid] dbg - 42');
  });

  it.each(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const)(
    'preserves errors and correlation ID at level %s',
    (level) => {
      const spy = jest.spyOn(ConsoleLogger.prototype, level).mockImplementation(() => undefined);
      const error = new Error('failure', { cause: new Error('root cause') });

      service[level]('Operation failed', { depotId: 'dep_1', error });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[cid: test-cid] Operation failed'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"failure"'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"root cause"'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"stack":'));
    },
  );

  it('formats an error supplied as the primary message', () => {
    expect(service.formatArgs(new Error('failure'))).toContain('"message":"failure"');
  });

  it('does not include HTTP client configuration from an error toJSON method', () => {
    const error = Object.assign(new Error('failure'), {
      toJSON: () => ({ config: { data: 'private XML', headers: { Authorization: 'secret' } } }),
    });

    const formatted = service.formatArgs('Failed', error);

    expect(formatted).toContain('"message":"failure"');
    expect(formatted).not.toContain('private XML');
    expect(formatted).not.toContain('secret');
  });

  it('handles circular objects, error causes and bigint without throwing', () => {
    const error = new Error('failure');
    error.cause = error;
    const context: { error: Error; count: bigint; self?: unknown } = { error, count: 42n };
    context.self = context;

    const formatted = service.formatArgs('Failed', context);

    expect(formatted).toContain('"count":"42"');
    expect(formatted).toContain('"cause":"[Circular]"');
    expect(formatted).toContain('"self":"[Circular]"');
  });

  it('does not throw when a context object cannot be serialized', () => {
    expect(
      service.formatArgs('Failed', {
        toJSON: () => {
          throw new Error('broken serialization');
        },
      }),
    ).toBe('[cid: test-cid] Failed - [Unserializable]');
  });

  it('formats messages without a correlation ID', () => {
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({ get: () => undefined } as never);

    expect(service.formatArgs('hello', { a: 1 })).toBe('hello - {"a":1}');
  });
});
