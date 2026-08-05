import { ConfigService } from '@nestjs/config';
import { resolveDatabasePoolSize } from './databasePoolSize';

const createConfigService = (config: Record<string, string>): ConfigService => {
  return new ConfigService(config);
};

describe('resolveDatabasePoolSize', () => {
  it('returns 50 for a configured API process', () => {
    const configService = createConfigService({
      PROCESS_TYPE: 'api',
      DATABASE_POOL_API: '50',
    });

    expect(resolveDatabasePoolSize(configService)).toBe(50);
  });

  it('returns 175 for a configured worker process', () => {
    const configService = createConfigService({
      PROCESS_TYPE: 'worker',
      DATABASE_POOL_WORKER: '175',
    });

    expect(resolveDatabasePoolSize(configService)).toBe(175);
  });

  it.each([
    ['api', 'DATABASE_POOL_API', '72', 72],
    ['worker', 'DATABASE_POOL_WORKER', '196', 196],
  ])('supports a custom pool size for the %s process', (processType, poolVariable, value, expected) => {
    const configService = createConfigService({
      PROCESS_TYPE: processType,
      [poolVariable]: value,
    });

    expect(resolveDatabasePoolSize(configService)).toBe(expected);
  });

  it('returns 50 when PROCESS_TYPE is absent', () => {
    const configService = createConfigService({
      DATABASE_POOL_API: '72',
      DATABASE_POOL_WORKER: '196',
    });

    expect(resolveDatabasePoolSize(configService)).toBe(50);
  });

  it.each(['api', 'worker'])('returns 50 when the pool variable for %s is absent', (processType) => {
    const configService = createConfigService({ PROCESS_TYPE: processType });

    expect(resolveDatabasePoolSize(configService)).toBe(50);
  });

  it.each(['scheduler', 'toString'])('rejects an unknown process type (%s)', (processType) => {
    const configService = createConfigService({ PROCESS_TYPE: processType });

    expect(() => resolveDatabasePoolSize(configService)).toThrow(`Unknown PROCESS_TYPE: ${processType}`);
  });

  it('rejects a non-numeric pool size', () => {
    const configService = createConfigService({
      PROCESS_TYPE: 'api',
      DATABASE_POOL_API: 'not-a-number',
    });

    expect(() => resolveDatabasePoolSize(configService)).toThrow('DATABASE_POOL_API must be a positive integer');
  });

  it.each(['0', '-1'])('rejects a zero or negative pool size (%s)', (poolSize) => {
    const configService = createConfigService({
      PROCESS_TYPE: 'worker',
      DATABASE_POOL_WORKER: poolSize,
    });

    expect(() => resolveDatabasePoolSize(configService)).toThrow('DATABASE_POOL_WORKER must be a positive integer');
  });

  it('rejects a decimal pool size', () => {
    const configService = createConfigService({
      PROCESS_TYPE: 'worker',
      DATABASE_POOL_WORKER: '175.5',
    });

    expect(() => resolveDatabasePoolSize(configService)).toThrow('DATABASE_POOL_WORKER must be a positive integer');
  });

  it.each([
    ['api', 'DATABASE_POOL_WORKER'],
    ['worker', 'DATABASE_POOL_API'],
  ])('ignores the pool variable belonging to the other process for %s', (processType, otherPoolVariable) => {
    const configService = createConfigService({
      PROCESS_TYPE: processType,
      [otherPoolVariable]: '999',
    });

    expect(resolveDatabasePoolSize(configService)).toBe(50);
  });
});
