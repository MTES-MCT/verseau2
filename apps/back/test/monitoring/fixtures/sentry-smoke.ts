// This fixture runs in a fresh Node process: Jest's setup has already loaded
// NestJS, which would make automatic instrumentation too late inside Jest.
import * as Sentry from '@sentry/nestjs';
import { getSentryOptions } from '../../../src/monitoring/sentry';

// Reserve stdout for the JSON result consumed by the parent test. Keep early
// instrumentation diagnostics visible on stderr instead.
console.info = (...args: unknown[]) => console.error(...args);

type TestEnvelope = Parameters<ReturnType<NonNullable<Sentry.NodeOptions['transport']>>['send']>[0];
const envelopes: TestEnvelope[] = [];
type TestSpan = Parameters<NonNullable<Sentry.NodeOptions['beforeSendSpan']>>[0];
const spans: TestSpan[] = [];
const options = getSentryOptions(
  {
    SENTRY_API_DSN: 'https://public@example.test/1',
    SENTRY_ENVIRONMENT: 'test',
    SENTRY_RELEASE: 'monitoring-smoke',
    SENTRY_TRACES_SAMPLE_RATE: '1',
  },
  'api',
)!;

Sentry.init({
  ...options,
  beforeSendSpan(span) {
    const clean = options.beforeSendSpan!(span);
    spans.push(structuredClone(clean));
    return clean;
  },
  // No Sentry network calls, even if the developer has real credentials set.
  transport: () => ({
    send: (envelope) => {
      envelopes.push(envelope);
      return Promise.resolve({ statusCode: 200 });
    },
    flush: () => Promise.resolve(true),
  }),
});

// These runtime imports must remain AFTER Sentry.init.
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { setTimeout } from 'node:timers/promises';
import { Body, Controller, Get, Module, Post, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { DataSource } from 'typeorm';
import { PgBoss } from 'pg-boss';
import request from 'supertest';
import { QueueService } from '../../../src/infra/queue/queue.service';
import { PGBOSS, QUEUE_PREFIX } from '../../../src/infra/queue/queue';
import { MonitoringModule } from '../../../src/monitoring/monitoring.module';

const queueName = 'monitoring_smoke';
const privateXml = '<private-body-marker />';
const source = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
boss.on('error', () => undefined); // The deliberately failed job is retried.

@Controller('smoke')
class SmokeController {
  constructor(private readonly queue: QueueService) {}

  @Post()
  async publish(@Body() body: { key: string; xml: string }) {
    await source.query('SELECT $1::text AS value', [body.xml]);
    const jobId = await this.queue.send(queueName, body);
    return { jobId, traceId: Sentry.getActiveSpan()?.spanContext().traceId };
  }

  @Get('expected')
  expected() {
    throw new BadRequestException('Expected client refusal');
  }

  @Get('unexpected')
  unexpected() {
    throw new Error('api technical failure');
  }
}

@Module({
  imports: [MonitoringModule, ClsModule.forRoot({ global: true, middleware: { mount: true } })],
  controllers: [SmokeController],
  providers: [QueueService, { provide: PGBOSS, useValue: boss }, { provide: QUEUE_PREFIX, useValue: undefined }],
})
class SmokeModule {}

async function main() {
  await source.initialize();
  await boss.start();
  await boss.createQueue(queueName, { retryLimit: 1, retryDelay: 0 });
  const app = await NestFactory.create(SmokeModule, { logger: false });
  await app.init();
  const server = app.getHttpServer() as Server;
  const queue = app.get(QueueService);
  const seen: { key: string; traceId: string; retryCount: number }[] = [];
  let finished = 0;
  let resolveCompleted: () => void;
  let rejectCompleted: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });

  try {
    for (let consumer = 0; consumer < 2; consumer++) {
      await queue.work<{ key: string; xml: string }>(
        queueName,
        { batchSize: 1, includeMetadata: true },
        async ([job]) => {
          assert.ok(!('__sentry' in job.data), 'trace metadata must not reach processors');
          const scope = Sentry.getCurrentScope();
          assert.equal(scope.getScopeData().tags.worker_marker, undefined, 'scope leaked from another job');
          assert.deepEqual(scope.getUser(), {});
          scope.setTag('worker_marker', job.id);
          seen.push({
            key: job.data.key,
            traceId: Sentry.getActiveSpan()!.spanContext().traceId,
            retryCount: job.retryCount ?? 0,
          });
          await source.query(
            "SELECT 'private-sql-literal' AS value, $1::text AS bound, $$private-dollar-literal$$ AS dollar -- private-sql-comment\n",
            [job.data.xml],
          );
          await setTimeout(20); // Interleave consumers to exercise async scope isolation.
          assert.equal(scope.getScopeData().tags.worker_marker, job.id);
          finished++;
          if (finished === 4) {
            setImmediate(() => resolveCompleted());
          }
          if (job.data.key === 'a' && job.retryCount === 0) {
            throw new Error('worker technical failure');
          }
        },
      );
    }

    const responses = await Promise.all(
      ['a', 'b'].map(async (key) => {
        const response = await request(server)
          .post('/smoke?token=private-url-marker')
          .set('Authorization', 'Bearer private-auth-marker')
          .set('Cookie', 'access_token=private-cookie-marker')
          .send({ key, xml: privateXml })
          .expect(201);
        return response.body as { jobId: string; traceId: string };
      }),
    );

    // Simulate an existing job published before Sentry was deployed.
    await boss.send(queueName, { key: 'legacy', xml: privateXml });
    const timeout = global.setTimeout(() => rejectCompleted(new Error('Timed out waiting for traced jobs')), 30000);
    try {
      await completed;
    } finally {
      clearTimeout(timeout);
    }
    for (const [index, key] of ['a', 'b'].entries()) {
      const attempts = seen.filter((item) => item.key === key);
      assert.equal(attempts.length, key === 'a' ? 2 : 1);
      assert.ok(
        attempts.every((item) => item.traceId === responses[index].traceId),
        'API/worker trace was broken',
      );
    }
    assert.deepEqual(
      seen
        .filter((item) => item.key === 'a')
        .map((item) => item.retryCount)
        .sort(),
      [0, 1],
    );
    assert.ok(!responses.some((item) => item.traceId === seen.find((entry) => entry.key === 'legacy')!.traceId));
    await request(server).get('/smoke/expected').expect(400);
    await request(server).get('/smoke/unexpected').expect(500);
  } finally {
    await boss.stop();
    await source.destroy();
    await app.close(); // MonitoringModule performs the final bounded flush.
  }

  const sql = spans.filter((span) => typeof span.attributes['db.query.text'] === 'string');
  const worker = spans.filter((span) => span.attributes['sentry.op'] === 'queue.process');
  const http = spans.filter((span) => span.attributes['sentry.op'] === 'http.server');
  assert.ok(sql.length >= 6, 'SQL spans missing');
  assert.equal(worker.length, 4);
  assert.ok(
    worker.every((span) => span.attributes.process_type === 'worker'),
    'worker spans must be identifiable',
  );
  assert.ok(
    http.every((span) => span.attributes.process_type === 'api'),
    'API spans must be identifiable',
  );
  assert.ok(
    http.some((span) => span.name === 'POST /smoke'),
    'HTTP route span missing',
  );
  for (const requestSpan of http.filter((span) => span.name === 'POST /smoke')) {
    assert.ok(
      sql.some((span) => span.trace_id === requestSpan.trace_id && span.attributes.process_type === 'api'),
      'API SQL span missing',
    );
  }
  for (const traceId of seen.map((item) => item.traceId)) {
    assert.ok(
      sql.some((span) => span.trace_id === traceId && span.attributes.process_type === 'worker'),
      'worker SQL span missing',
    );
  }
  assert.ok(
    sql.every((span) => Number(span.end_timestamp) >= span.start_timestamp),
    'SQL timing missing',
  );
  assert.ok(
    sql.some((span) => String(span.attributes['db.query.text']).includes('$1')),
    'parameterized SQL was removed',
  );
  const serialized = JSON.stringify(envelopes);
  for (const marker of [
    privateXml,
    'private-url-marker',
    'private-auth-marker',
    'private-cookie-marker',
    'private-sql-literal',
    'private-dollar-literal',
    'private-sql-comment',
  ]) {
    assert.ok(!serialized.includes(marker), `Sensitive data escaped: ${marker}`);
  }
  const errors = envelopes.flatMap((envelope) =>
    envelope[1].filter((item) => item[0].type === 'event').map((item) => item[1] as Sentry.Event),
  );
  assert.equal(
    errors.filter((event) => event.exception?.values?.some((value) => value.value === 'worker technical failure'))
      .length,
    1,
  );
  assert.equal(
    errors.filter((event) => event.exception?.values?.some((value) => value.value === 'api technical failure')).length,
    1,
  );
  assert.ok(!serialized.includes('Expected client refusal'));
  assert.equal(Sentry.isInitialized(), false, 'shutdown did not close Sentry');
  console.log(JSON.stringify({ sqlSpans: sql.length, workerSpans: worker.length, httpSpans: http.length }));
}

void main().catch(async (error: unknown) => {
  console.error(error);
  await Sentry.close(2000);
  process.exitCode = 1;
});
