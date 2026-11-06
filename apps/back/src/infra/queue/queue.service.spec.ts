import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import * as Sentry from '@sentry/nestjs';
import type { ClsService } from 'nestjs-cls';
import type { CustomClsStore } from '@shared/logger/cls-store.interface';
import type { PgBoss, SendOptions } from './pgboss';
import type { QueueJob } from './queue';
import { QueueService } from './queue.service';

jest.mock('@sentry/nestjs', () => {
  const { createMock } = jest.requireActual<typeof import('@golevelup/ts-jest')>('@golevelup/ts-jest');
  return createMock<typeof import('@sentry/nestjs')>();
});

describe('QueueService tracing', () => {
  let boss: DeepMocked<PgBoss<object>>;
  let cls: DeepMocked<ClsService<CustomClsStore>>;
  let service: QueueService;
  let consume: (jobs: QueueJob<{ depotId: string }>[]) => Promise<unknown>;
  const job: QueueJob<{ depotId: string }> = { id: 'job-1', name: 'test__process_file', data: { depotId: 'depot-1' } };

  beforeEach(() => {
    jest.resetAllMocks();
    boss = createMock<PgBoss<object>>();
    cls = createMock<ClsService<CustomClsStore>>();
    cls.get.mockReturnValue(undefined);
    service = new QueueService(boss, cls, 'test');
    boss.send.mockResolvedValue('job-1');
    boss.work.mockImplementation((_name, _options, handler) => {
      consume = handler;
      return Promise.resolve('worker-1');
    });
    jest.mocked(Sentry.isInitialized).mockReturnValue(true);
    jest
      .mocked(Sentry.getTraceData)
      .mockReturnValue({ 'sentry-trace': 'trace-parent-1', baggage: 'sentry-environment=test' });
    jest.mocked(Sentry.startSpan).mockImplementation((_options, callback) => callback(createMock<Sentry.Span>()));
    jest.mocked(Sentry.Scope).mockImplementation(() => createMock<Sentry.Scope>());
    jest
      .mocked(Sentry.withIsolationScope)
      .mockImplementation((_scope, callback) => callback(createMock<Sentry.Scope>()));
    jest.mocked(Sentry.withScope).mockImplementation((_scope, callback) => callback(createMock<Sentry.Scope>()));
    jest.mocked(Sentry.continueTrace).mockImplementation((_trace, callback) => callback());
    jest.mocked(Sentry.startNewTrace).mockImplementation((callback) => callback());
  });

  it('propagates trace metadata and correlation ID without changing send options', async () => {
    cls.get.mockReturnValue('correlation-1');
    const options: SendOptions = { retryLimit: 2, db: createMock<NonNullable<SendOptions['db']>>() };
    await expect(service.send('process_file', { depotId: 'depot-1' }, options)).resolves.toBe('job-1');
    expect(boss.send.mock.calls).toEqual([
      [
        'test__process_file',
        {
          depotId: 'depot-1',
          correlationId: 'correlation-1',
          __sentry: { sentryTrace: 'trace-parent-1', baggage: 'sentry-environment=test' },
        },
        options,
      ],
    ]);
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'process_file', op: 'queue.publish' }),
      expect.any(Function),
    );
  });

  it('preserves singleton deduplication results', async () => {
    boss.send.mockResolvedValue(null);
    await expect(service.send('process_file')).resolves.toBeNull();
  });

  it('continues producer traces without exposing instrumentation metadata to processors', async () => {
    const handler = jest.fn().mockResolvedValue('result');
    await service.work('process_file', { batchSize: 1 }, handler);
    const tracedJob = { ...job, data: { ...job.data, __sentry: { sentryTrace: 'parent', baggage: 'baggage' } } };
    await expect(consume([tracedJob])).resolves.toBe('result');
    expect(handler).toHaveBeenCalledWith([job]);
    expect(Sentry.continueTrace).toHaveBeenCalledWith(
      { sentryTrace: 'parent', baggage: 'baggage' },
      expect.any(Function),
    );
    expect(Sentry.withIsolationScope).toHaveBeenCalledTimes(1);
    expect(Sentry.withScope).toHaveBeenCalledTimes(1);
  });

  it('starts independent traces for previously queued jobs', async () => {
    await service.work('process_file', { batchSize: 1 }, jest.fn().mockResolvedValue(undefined));
    await consume([job]);
    expect(Sentry.startNewTrace).toHaveBeenCalledTimes(1);
    expect(Sentry.continueTrace).not.toHaveBeenCalled();
  });

  it('reports and rethrows the same handler failure for pg-boss retries', async () => {
    const error = new Error('worker failed');
    await service.work('process_file', { batchSize: 1 }, jest.fn().mockRejectedValue(error));
    await expect(consume([job])).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('does not split batches or choose one job trace as their parent', async () => {
    const handler = jest.fn().mockResolvedValue('batch-result');
    await service.work('process_file', { batchSize: 2 }, handler);
    const jobs = [job, { ...job, id: 'job-2' }];
    await expect(consume(jobs)).resolves.toBe('batch-result');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(jobs);
    expect(Sentry.continueTrace).not.toHaveBeenCalled();
  });

  it('keeps sending and processing unchanged when Sentry is disabled', async () => {
    jest.mocked(Sentry.isInitialized).mockReturnValue(false);
    const payload = { depotId: 'depot-1' };
    await service.send('process_file', payload);
    expect(boss.send.mock.calls).toEqual([['test__process_file', payload, undefined]]);
    const handler = jest.fn().mockResolvedValue('result');
    await service.work('process_file', { batchSize: 1 }, handler);
    await expect(consume([job])).resolves.toBe('result');
    expect(handler).toHaveBeenCalledWith([job]);
    expect(Sentry.startSpan).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('strips metadata from already queued jobs even after monitoring is disabled', async () => {
    jest.mocked(Sentry.isInitialized).mockReturnValue(false);
    const handler = jest.fn().mockResolvedValue(undefined);
    await service.work('process_file', { batchSize: 1 }, handler);
    await consume([
      { ...job, data: { ...job.data, __sentry: { sentryTrace: 'parent' } } } as QueueJob<typeof job.data>,
    ]);
    expect(handler).toHaveBeenCalledWith([job]);
    expect(Sentry.startSpan).not.toHaveBeenCalled();
  });
});
