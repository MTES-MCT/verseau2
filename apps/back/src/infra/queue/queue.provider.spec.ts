import { ConfigService } from '@nestjs/config';
import { resolvePgBossConnectionTimeoutMillis, resolvePgBossPoolMax } from './queue.provider';

const createConfigService = (config: Record<string, string | null>): ConfigService => {
  return new ConfigService(config);
};

describe('resolvePgBossPoolMax', () => {
  it('defaults to 10 when the variable is absent', () => {
    const configService = createConfigService({});

    expect(resolvePgBossPoolMax(configService)).toBe(10);
  });

  it('defaults to 10 when the variable is null', () => {
    const configService = createConfigService({ PGBOSS_POOL_MAX: null });

    expect(resolvePgBossPoolMax(configService)).toBe(10);
  });

  it('returns the configured pool size', () => {
    const configService = createConfigService({ PGBOSS_POOL_MAX: '6' });

    expect(resolvePgBossPoolMax(configService)).toBe(6);
  });

  it.each(['not-a-number', '', '0', '-1', '10.5'])('rejects an invalid pool size (%s)', (poolMax) => {
    const configService = createConfigService({ PGBOSS_POOL_MAX: poolMax });

    expect(() => resolvePgBossPoolMax(configService)).toThrow('PGBOSS_POOL_MAX must be a positive integer');
  });
});

describe('resolvePgBossConnectionTimeoutMillis', () => {
  it('defaults to 10000 ms when the variable is absent', () => {
    const configService = createConfigService({});

    expect(resolvePgBossConnectionTimeoutMillis(configService)).toBe(10_000);
  });

  it('defaults to 10000 ms when the variable is null', () => {
    const configService = createConfigService({ PGBOSS_CONNECTION_TIMEOUT_MS: null });

    expect(resolvePgBossConnectionTimeoutMillis(configService)).toBe(10_000);
  });

  it('returns the configured timeout', () => {
    const configService = createConfigService({ PGBOSS_CONNECTION_TIMEOUT_MS: '30000' });

    expect(resolvePgBossConnectionTimeoutMillis(configService)).toBe(30_000);
  });

  it.each(['not-a-number', '', '0', '-1', '10.5'])('rejects an invalid timeout (%s)', (timeout) => {
    const configService = createConfigService({ PGBOSS_CONNECTION_TIMEOUT_MS: timeout });

    expect(() => resolvePgBossConnectionTimeoutMillis(configService)).toThrow(
      'PGBOSS_CONNECTION_TIMEOUT_MS must be a positive integer',
    );
  });
});
