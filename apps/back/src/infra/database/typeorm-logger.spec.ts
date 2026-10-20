import { LoggerService } from '@shared/logger/logger.service';
import { TypeOrmLogger } from './typeorm-logger';

describe('TypeOrmLogger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps normal SQL at debug level and failures visible without parameter values', () => {
    const debug = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation(() => undefined);
    const error = jest.spyOn(LoggerService.prototype, 'error').mockImplementation(() => undefined);
    const logger = new TypeOrmLogger();

    logger.logQuery('SELECT\n $1', ['private-value']);
    logger.logQueryError('Query failed', 'SELECT\n $1', ['private-value']);

    expect(debug).toHaveBeenCalledWith('Query', { query: 'SELECT $1', parameterCount: 1 });
    expect(error).toHaveBeenCalledWith('Query failed', {
      error: 'Query failed',
      query: 'SELECT $1',
      parameterCount: 1,
    });
    expect(debug).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(debug.mock.calls)).not.toContain('private-value');
    expect(JSON.stringify(error.mock.calls)).not.toContain('private-value');
  });

  it('logs slow queries at warn level without parameter values', () => {
    const warn = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation(() => undefined);

    new TypeOrmLogger().logQuerySlow(1200, 'SELECT $1', ['private-value']);

    expect(warn).toHaveBeenCalledWith('Slow query', { time: 1200, query: 'SELECT $1', parameterCount: 1 });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-value');
  });
});
