import { Logger } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { TraceCalls } from './traceCalls.decorator';

// Mock NestJS Logger
jest.mock('@nestjs/common', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('@nestjs/common');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    Logger: jest.fn().mockImplementation(function (this: any) {
      this.log = jest.fn();
      this.debug = jest.fn();
      this.error = jest.fn();
      this.warn = jest.fn();
    }),
  };
});

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

    (Logger as any).mockImplementation(function (this: any) {
      this.log = mockLogger.log;
      this.debug = mockLogger.debug;
      this.error = mockLogger.error;
      this.warn = jest.fn();
    });

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
    async errorMethod() {
      return Promise.reject(new Error('Failure'));
    }
  }

  it('should log start, internal calls, service calls and end with CID', async () => {
    const example = new Example();
    const result = await example.mainMethod('input');

    expect(result).toBe('service-internal-input');

    // Check Start log
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[cid: test-cid\] \[callId: [a-z0-9]+\]>>> \[START\] mainMethod/),
    );

    // Check Internal call log
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[cid: test-cid\] \[callId: [a-z0-9]+\] {4}\[INTERNAL CALL\] this.internalMethod\(\) - \d+\.\d+ms/,
      ),
    );

    // Check Service call log
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[cid: test-cid\] \[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] subService.doSomething\(\) - \d+\.\d+ms/,
      ),
    );

    // Check End log with duration
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[cid: test-cid\] \[callId: [a-z0-9]+\]<<< \[END\] mainMethod \| Duration: \d+\.\d+ms/),
    );
  });

  it('should work with synchronous methods and different log levels', () => {
    const example = new Example();
    example.syncMain();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[cid: test-cid\] \[callId: [a-z0-9]+\]>>> \[START\] syncMain/),
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] subService.syncMethod\(\) - \d+\.\d+ms/),
    );
  });

  it('should log errors with duration', async () => {
    const example = new Example();

    await expect(example.errorMethod()).rejects.toThrow('Failure');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[cid: test-cid\] \[callId: [a-z0-9]+\] !!! \[ERROR\] errorMethod \| Duration: \d+\.\d+ms \| Failure/,
      ),
    );
  });

  it('should handle missing CID gracefully', async () => {
    mockClsService.get.mockReturnValue(undefined);
    const example = new Example();
    await example.mainMethod('test');

    expect(mockLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('[cid:'));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/\[callId: [a-z0-9]+\]>>> \[START\] mainMethod/));
  });

  it('should work with synchronous methods and different log levels', () => {
    const example = new Example();
    example.syncMain();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[cid: test-cid\] \[callId: [a-z0-9]+\]>>> \[START\] syncMain/),
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] subService.syncMethod\(\) - \d+\.\d+ms/),
    );
  });

  it('should log errors with duration', async () => {
    const example = new Example();

    await expect(example.errorMethod()).rejects.toThrow('Failure');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[cid: test-cid\] \[callId: [a-z0-9]+\] !!! \[ERROR\] errorMethod \| Duration: \d+\.\d+ms \| Failure/,
      ),
    );
  });

  it('should handle missing CID gracefully', async () => {
    mockClsService.get.mockReturnValue(undefined);
    const example = new Example();
    await example.mainMethod('test');

    expect(mockLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('[cid:'));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/\[callId: [a-z0-9]+\]>>> \[START\] mainMethod/));
  });

  it('should work with synchronous methods and different log levels', () => {
    const example = new Example();
    example.syncMain();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[cid: test-cid\] \[callId: [a-z0-9]+\]>>> \[START\] syncMain/),
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[callId: [a-z0-9]+\] {4}\[SERVICE CALL\] subService.syncMethod\(\) - \d+\.\d+ms/),
    );
  });

  it('should log errors with duration', async () => {
    const example = new Example();

    await expect(example.errorMethod()).rejects.toThrow('Failure');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[cid: test-cid\] \[callId: [a-z0-9]+\] !!! \[ERROR\] errorMethod \| Duration: \d+\.\d+ms \| Failure/,
      ),
    );
  });

  it('should handle missing CID gracefully', async () => {
    mockClsService.get.mockReturnValue(undefined);
    const example = new Example();
    await example.mainMethod('test');

    expect(mockLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('[cid:'));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/\[callId: [a-z0-9]+\]>>> \[START\] mainMethod/));
  });
});
