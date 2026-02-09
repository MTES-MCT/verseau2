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
});
