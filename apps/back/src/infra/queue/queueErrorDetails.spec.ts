import { LoggerService } from '@shared/logger/logger.service';
import { getQueueErrorDetails } from './queueErrorDetails';

describe('getQueueErrorDetails', () => {
  it('preserves plain-object pg-boss errors and worker context in the formatted log', () => {
    const error = {
      message: 'Connection terminated due to connection timeout',
      stack: 'Error: Connection terminated due to connection timeout\n    at connect',
      code: 'ETIMEDOUT',
      queue: 'process_file',
      worker: 'worker-id',
    };

    const details = getQueueErrorDetails(error);
    const formatted = new LoggerService('QueueModule').formatArgs('PgBoss error', details);

    expect(details).toEqual(error);
    expect(formatted).toContain(JSON.stringify(error));
    expect(formatted).not.toContain('[object Object]');
  });

  it('preserves non-enumerable Error diagnostics and database codes', () => {
    const error = Object.assign(new Error('too many connections'), { code: '53300' });

    expect(getQueueErrorDetails(error)).toEqual({
      name: 'Error',
      message: error.message,
      stack: error.stack,
      code: '53300',
    });
  });

  it.each([
    ['failure', 'failure'],
    [null, 'null'],
    [undefined, 'undefined'],
    [42, '42'],
  ])('handles a non-object error: %s', (error, message) => {
    expect(getQueueErrorDetails(error)).toEqual({ message });
  });

  it('does not expose job payloads, connection configuration, causes or custom serialization', () => {
    const error = {
      message: 'failure',
      queue: 'process_file',
      data: { xml: 'private XML' },
      connectionString: 'postgres://user:secret@database/app',
      cause: { password: 'secret' },
      toJSON: () => ({ password: 'secret' }),
    };

    expect(getQueueErrorDetails(error)).toEqual({
      message: 'failure',
      queue: 'process_file',
    });
  });

  it('ignores objects stored in diagnostic fields', () => {
    expect(getQueueErrorDetails({ message: 'failure', code: { password: 'secret' }, worker: {} })).toEqual({
      message: 'failure',
    });
  });

  it('preserves numeric error codes', () => {
    expect(getQueueErrorDetails({ message: 'failure', code: 123 })).toEqual({ message: 'failure', code: 123 });
  });

  it('provides a fallback message for an object without a usable message', () => {
    expect(getQueueErrorDetails({})).toEqual({ message: 'Unknown queue error' });
  });
});
