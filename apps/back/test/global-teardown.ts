import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';

export default async function () {
  const postgresContainer = (global as any).__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer;
  if (postgresContainer) {
    await postgresContainer.stop();
  }

  const envPath = path.join(__dirname, 'test-env.json');
  if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath);
  }
}
