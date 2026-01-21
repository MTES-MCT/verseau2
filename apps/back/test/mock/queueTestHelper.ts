/**
 * Queue test utilities for E2E tests with real PgBoss queue.
 * Provides helpers to wait for job completion and verify job states.
 */
import { PgBoss } from 'pg-boss';
import { DataSource } from 'typeorm';
import { QueueName } from '@infra/queue/queue';

export interface PgBossJobRow {
  id: string;
  name: string;
  data: Record<string, unknown>;
  state: 'created' | 'retry' | 'active' | 'completed' | 'expired' | 'cancelled' | 'failed';
  output?: Record<string, unknown>;
  completed_on?: Date;
}

export interface JobCompletionResult {
  status: 'completed' | 'failed' | 'timeout';
  job?: PgBossJobRow;
}

/**
 * Wait for a specific condition with polling.
 */
export async function waitFor(
  predicate: () => Promise<boolean>,
  options: { timeoutMs?: number; pollIntervalMs?: number; message?: string } = {},
): Promise<void> {
  const { timeoutMs = 30000, pollIntervalMs = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`Timeout: ${message} (waited ${timeoutMs}ms)`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Query pg-boss job table directly for test inspection.
 * This allows us to check job states without consuming jobs.
 */
export async function getJobsForDepot(
  dataSource: DataSource,
  queueName: QueueName,
  depotId: string,
): Promise<PgBossJobRow[]> {
  const result = await dataSource.query(
    `SELECT id, name, data, state, output, completed_on 
     FROM pgboss.job 
     WHERE name = $1 AND data->>'depotId' = $2
     ORDER BY created_on DESC`,
    [queueName, depotId],
  );
  return result as PgBossJobRow[];
}

/**
 * Get all jobs in a queue for inspection.
 */
export async function getAllJobsInQueue(dataSource: DataSource, queueName: QueueName): Promise<PgBossJobRow[]> {
  const result = await dataSource.query(
    `SELECT id, name, data, state, output, completed_on 
     FROM pgboss.job 
     WHERE name = $1
     ORDER BY created_on DESC`,
    [queueName],
  );
  return result as PgBossJobRow[];
}

/**
 * Wait for a job matching the given depotId to reach a terminal state (completed or failed).
 */
export async function waitForJobCompletion(
  dataSource: DataSource,
  queueName: QueueName,
  depotId: string,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<JobCompletionResult> {
  const { timeoutMs = 30000, pollIntervalMs = 1000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const jobs = await getJobsForDepot(dataSource, queueName, depotId);

    for (const job of jobs) {
      if (job.state === 'completed') {
        return { status: 'completed', job };
      }
      if (job.state === 'failed') {
        return { status: 'failed', job };
      }
    }

    await sleep(pollIntervalMs);
  }

  return { status: 'timeout' };
}

/**
 * Wait for all active jobs in a queue to be processed.
 */
export async function waitForQueueDrain(
  dataSource: DataSource,
  queueName: QueueName,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<void> {
  const { timeoutMs = 30000, pollIntervalMs = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await dataSource.query(
      `SELECT COUNT(*) as count 
       FROM pgboss.job 
       WHERE name = $1 AND state IN ('created', 'retry', 'active')`,
      [queueName],
    );

    const count = parseInt(result[0]?.count ?? '0', 10);
    if (count === 0) {
      return;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timeout waiting for queue ${queueName} to drain (waited ${timeoutMs}ms)`);
}

/**
 * Count jobs in a specific state for a queue.
 */
export async function countJobsInState(
  dataSource: DataSource,
  queueName: QueueName,
  state: 'created' | 'retry' | 'active' | 'completed' | 'failed',
): Promise<number> {
  const result = await dataSource.query(
    `SELECT COUNT(*) as count 
     FROM pgboss.job 
     WHERE name = $1 AND state = $2`,
    [queueName, state],
  );
  return parseInt(result[0]?.count ?? '0', 10);
}
