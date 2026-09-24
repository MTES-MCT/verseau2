/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Echoue vite (5 s) avec un message actionnable si le daemon Docker est injoignable ou wedge
 * (typiquement OrbStack apres une mise en veille), au lieu de laisser les tests tourner
 * en boucle jusqu'au timeout Jest.
 */
async function assertDockerAvailable(): Promise<void> {
  try {
    await execAsync('docker info --format "{{.ServerVersion}}"', { timeout: 5_000 });
  } catch {
    throw new Error(
      'Docker (OrbStack) ne repond pas : les tests e2e ne peuvent pas demarrer leur conteneur Postgres. ' +
        'Redemarrez OrbStack puis relancez les tests (verifiez avec `docker ps` dans un terminal).',
    );
  }
}

export default async function () {
  await assertDockerAvailable();

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
