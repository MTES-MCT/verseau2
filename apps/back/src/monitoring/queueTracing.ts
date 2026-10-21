import * as Sentry from '@sentry/nestjs';
import type { QueueJob } from '@queue/queue';

interface TraceData {
  sentryTrace?: string;
  baggage?: string;
}

interface TracedData {
  __sentry?: TraceData;
  correlationId?: string;
}

export async function traceQueuePublish<T>(
  name: string,
  data: object | undefined,
  publish: (data: object | undefined) => Promise<T>,
): Promise<T> {
  if (!Sentry.isInitialized()) {
    return await publish(data);
  }

  return await Sentry.startSpan(
    { name, op: 'queue.publish', attributes: { 'messaging.destination.name': name } },
    async (span) => {
      const { 'sentry-trace': sentryTrace, baggage } = Sentry.getTraceData();
      const result = await publish({ ...data, __sentry: { sentryTrace, baggage } satisfies TraceData });
      if (typeof result === 'string') {
        span.setAttribute('messaging.message.id', result);
      }
      return result;
    },
  );
}

export async function traceQueueProcess<TData>(
  name: string,
  jobs: QueueJob<TData>[],
  handler: (jobs: QueueJob<TData>[]) => Promise<unknown>,
): Promise<unknown> {
  // All current consumers use batchSize: 1. Preserve batch handler semantics if
  // another consumer requests multiple jobs; never pick an arbitrary parent.
  const job = jobs.length === 1 ? jobs[0] : undefined;
  const data = job?.data as TracedData | undefined;
  const trace = data?.__sentry;
  const cleanJobs = jobs.map((item) => {
    if (item.data && typeof item.data === 'object' && '__sentry' in item.data) {
      const { __sentry: _trace, ...payload } = item.data;
      return { ...item, data: payload as TData };
    }
    return item;
  });

  if (!Sentry.isInitialized()) {
    return await handler(cleanJobs);
  }

  const scope = new Sentry.Scope();
  scope.setClient(Sentry.getClient());
  return await Sentry.withIsolationScope(
    new Sentry.Scope(),
    async () =>
      await Sentry.withScope(scope, async () => {
        // A queue handler must not inherit user/request data from its producer or
        // from a previous job. Process-wide release/environment remain on the client.
        scope.setTag('process_type', 'worker');
        scope.setAttribute('process_type', 'worker');
        scope.setTag('queue', name);
        if (job) {
          scope.setTag('job_id', job.id);
        }
        if (typeof data?.correlationId === 'string') {
          scope.setTag('correlation_id', data.correlationId);
        }

        const process = async () =>
          await Sentry.startSpan(
            {
              name,
              op: 'queue.process',
              forceTransaction: true,
              attributes: {
                'messaging.destination.name': name,
                'messaging.batch.message_count': jobs.length,
                'messaging.message.id': job?.id,
                'messaging.message.retry.count': job?.retryCount,
              },
            },
            async () => {
              try {
                return await handler(cleanJobs);
              } catch (error) {
                Sentry.captureException(error);
                throw error; // Preserve pg-boss failures and retries.
              }
            },
          );

        if (typeof trace?.sentryTrace === 'string') {
          return await Sentry.continueTrace(
            { sentryTrace: trace.sentryTrace, baggage: typeof trace.baggage === 'string' ? trace.baggage : undefined },
            process,
          );
        }
        // Jobs queued before instrumentation have no propagation metadata.
        return await Sentry.startNewTrace(process);
      }),
  );
}
