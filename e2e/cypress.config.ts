import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import { Client } from 'pg';

export default defineConfig({
  video: true,
  screenshotsFolder: 'artifacts/screenshots',
  videosFolder: 'artifacts/videos',
  downloadsFolder: 'artifacts/downloads',
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'features/**/*.feature',
    supportFile: 'support/e2e.ts',
    fixturesFolder: 'fixtures',
    testIsolation: true,
    setupNodeEvents: async (on, config) => {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }));
      on('task', {
        async workerJobState({ depotId, queue }: { depotId: string; queue: 'process_file' | 'controle_metier' }): Promise<string | null> {
          const client = new Client({ connectionString: process.env.DATABASE_URL });
          await client.connect();
          try {
            const result = await client.query<{ state: string }>(
              `SELECT state FROM pgboss.job WHERE name = $1 AND data->>'depotId' = $2 ORDER BY created_on DESC LIMIT 1`,
              [`${process.env.QUEUE_PREFIX}__${queue}`, depotId],
            );
            return result.rows[0]?.state ?? null;
          } finally {
            await client.end();
          }
        },
      });
      return config;
    },
  },
});
