import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: StartedPostgreSqlContainer | null = null;

export async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  if (!postgresContainer) {
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
  }
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
