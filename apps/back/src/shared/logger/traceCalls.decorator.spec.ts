import { ClsServiceManager } from 'nestjs-cls';
import { LoggerService } from './logger.service';
import { TraceCalls } from './traceCalls.decorator';

// Mock LoggerService
jest.mock('./logger.service', () => ({
  LoggerService: jest.fn(),
}));

// Mock nestjs-cls
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(),
  },
}));

describe('TraceCalls Decorator', () => {
  let mockLogger: {
    log: jest.Mock;
    debug: jest.Mock;
    error: jest.Mock;
  };
  let mockClsService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    (LoggerService as unknown as jest.Mock).mockImplementation(() => ({
      log: mockLogger.log,
      debug: mockLogger.debug,
      error: mockLogger.error,
      warn: jest.fn(),
    }));

    mockClsService = {
      get: jest.fn().mockReturnValue('test-cid'),
    };
    (ClsServiceManager.getClsService as any).mockReturnValue(mockClsService);
  });

  class SubService {
    doSomething(val: string) {
      return `service-${val}`;
    }
    syncMethod() {
      return 'sync';
    }
  }

  class Example {
    private readonly subService = new SubService();
    private readonly dependency = {
      greet: (value: string) => `hello-${value}`,
    };

    @TraceCalls('log')
    async mainMethod(input: string) {
      const internal = await this.internalMethod(input);
      const service = this.subService.doSomething(internal);
      return service;
    }

    @TraceCalls('debug')
    syncMain() {
      this.subService.syncMethod();
      return 'done';
    }

    async internalMethod(val: string) {
      return Promise.resolve(`internal-${val}`);
    }

    @TraceCalls('log')
    async usesDependencyThroughInternalMethod(input: string) {
      return this.internalMethodUsingDependency(input);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async internalMethodUsingDependency(val: string) {
      return this.dependency.greet(val);
    }

    @TraceCalls('log')
    async errorMethod() {
      return Promise.reject(new Error('Failure'));
    }
  }

  it('should buffer all log lines and flush them sequentially at the end', async () => {
    const example = new Example();
    const result = await example.mainMethod('input');

    expect(result).toBe('service-internal-input');

    // All lines should be flushed sequentially at the end
    expect(mockLogger.log).toHaveBeenCalledTimes(4);

    expect(mockLogger.log.mock.calls[0][0]).toMatch(/\[callId: [a-z0-9]+\]>>> \[START\] mainMethod/);
    expect(mockLogger.log.mock.calls[1][0]).toMatch(
      /\[callId: [a-z0-9]+\] {4}\[INTERNAL CALL\] this.internalMethod\(\) - \d+\.\d+ms/,
    );
    expect(mockLogger.log.mock.calls[2][0]).toMatch(
      /\[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] subService.doSomething\(\) - \d+\.\d+ms/,
    );
    expect(mockLogger.log.mock.calls[3][0]).toMatch(
      /\[callId: [a-z0-9]+\]<<< \[END\] mainMethod \| Duration: \d+\.\d+ms/,
    );
  });

  it('should work with synchronous methods and different log levels', () => {
    const example = new Example();
    example.syncMain();

    expect(mockLogger.debug).toHaveBeenCalledTimes(3);

    expect(mockLogger.debug.mock.calls[0][0]).toMatch(/\[callId: [a-z0-9]+\]>>> \[START\] syncMain/);
    expect(mockLogger.debug.mock.calls[1][0]).toMatch(
      /\[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] subService.syncMethod\(\) - \d+\.\d+ms/,
    );
    expect(mockLogger.debug.mock.calls[2][0]).toMatch(
      /\[callId: [a-z0-9]+\]<<< \[END\] syncMain \| Duration: \d+\.\d+ms/,
    );
  });

  it('should buffer and flush error logs sequentially at the end', async () => {
    const example = new Example();

    await expect(example.errorMethod()).rejects.toThrow('Failure');

    expect(mockLogger.error).toHaveBeenCalledTimes(2);

    expect(mockLogger.error.mock.calls[0][0]).toMatch(/\[callId: [a-z0-9]+\]>>> \[START\] errorMethod/);
    expect(mockLogger.error.mock.calls[1][0]).toMatch(
      /\[callId: [a-z0-9]+\] !!! \[ERROR\] errorMethod \| Duration: \d+\.\d+ms \| Failure/,
    );
  });

  it('should preserve proxied this when an internal method uses an injected-like dependency', async () => {
    const example = new Example();

    await expect(example.usesDependencyThroughInternalMethod('world')).resolves.toBe('hello-world');

    expect(mockLogger.log).toHaveBeenCalledTimes(4);

    expect(mockLogger.log.mock.calls[0][0]).toMatch(
      /\[callId: [a-z0-9]+\]>>> \[START\] usesDependencyThroughInternalMethod/,
    );
    expect(mockLogger.log.mock.calls[1][0]).toMatch(
      /\[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] dependency.greet\(\) - \d+\.\d+ms/,
    );
    expect(mockLogger.log.mock.calls[2][0]).toMatch(
      /\[callId: [a-z0-9]+\] {4}\[INTERNAL CALL\] this.internalMethodUsingDependency\(\) - \d+\.\d+ms/,
    );
    expect(mockLogger.log.mock.calls[3][0]).toMatch(
      /\[callId: [a-z0-9]+\]<<< \[END\] usesDependencyThroughInternalMethod \| Duration: \d+\.\d+ms/,
    );
  });

  it('should handle missing CID gracefully', async () => {
    mockClsService.get.mockReturnValue(undefined);
    const example = new Example();
    await example.mainMethod('test');

    expect(mockLogger.log).toHaveBeenCalledTimes(4);
    expect(mockLogger.log.mock.calls[0][0] as string).not.toMatch(/\[cid:/);
    expect(mockLogger.log.mock.calls[0][0] as string).toMatch(/\[callId: [a-z0-9]+\]>>> \[START\] mainMethod/);
  });
});
