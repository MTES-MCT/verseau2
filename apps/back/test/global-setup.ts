import { PostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';

export default async function () {
  const postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withSharedMemorySize(256 * 1024 * 1024)
    .withCommand(['postgres', '-c', 'fsync=off', '-c', 'full_page_writes=off'])
    .start();

  (global as any).__POSTGRES_CONTAINER__ = postgresContainer;

  const envConfig = {
    uri: postgresContainer.getConnectionUri(),
  };

  fs.writeFileSync(path.join(__dirname, 'test-env.json'), JSON.stringify(envConfig));
}
