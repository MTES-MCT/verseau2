/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { ulid } from 'ulid';
import { Client } from 'pg';

let postgresContainer: StartedPostgreSqlContainer | null = null;

export async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  if (postgresContainer) {
    return postgresContainer;
  }

  const envPath = path.join(__dirname, 'test-env.json');
  if (fs.existsSync(envPath)) {
    const config = JSON.parse(fs.readFileSync(envPath, 'utf-8')) as { uri: string };
    const baseUri = config.uri;

    // Create a unique database for this worker/test suite
    const dbName = `test_${ulid().toLowerCase()}`;

    const client = new Client({ connectionString: baseUri });
    await client.connect();
    await client.query(`CREATE DATABASE "${dbName}"`);
    await client.end();

    const url = new URL(baseUri);
    url.pathname = `/${dbName}`;
    const newUri = url.toString();

    postgresContainer = {
      getConnectionUri: () => newUri,
      stop: async () => {},
    } as unknown as StartedPostgreSqlContainer;
    return postgresContainer;
  }

  postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withSharedMemorySize(256 * 1024 * 1024)
    .withCommand(['postgres', '-c', 'fsync=off', '-c', 'full_page_writes=off'])
    .start();

  return postgresContainer;
}

export async function stopPostgresContainer(): Promise<void> {
  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
  }
}

export function getPostgresConnectionUri(): string {
  if (!postgresContainer) {
    throw new Error('Postgres container not started');
  }
  return postgresContainer.getConnectionUri();
}
