import { Client } from 'pg';
import { createReferentielDataset, seedSteu, seedScl } from '../../../apps/back/test/createReferentielDataset.ts';
import { seedUserWithDroits, seedVSteuSclItv } from '../../../apps/back/test/userWithDroitsDataset.helper.ts';

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// The backend test helpers require only DataSource.query; use the same SQL
// without creating a second application connection or importing Nest modules.
const database = {
  query: async (statement, values) => (await client.query(statement, values)).rows,
};

try {
  if (process.argv[2] === 'schemas') {
    await createReferentielDataset(database);
  } else if (process.argv[2] === 'user') {
    const [{ userTable }] = await database.query(`SELECT to_regclass('public."user"') AS "userTable"`);
    if (!userTable) {
      throw new Error('The E2E database is missing public."user" after API startup. Check artifacts/logs/api.log for TypeORM schema initialization.');
    }
    await seedUserWithDroits(database, {
      sub: 'e2e-user',
      email: 'e2e@example.com',
      itvCdn: 100,
      itvRfa: '12345678901234',
    });
    await seedSteu(database, 1000, 'TEST_STEU_001');
    await seedScl(database, 1001, 'TEST_SCL_001');
    await seedVSteuSclItv(database, 'TEST_STEU_001', 'TEST_SCL_001', '12345678901234');
  } else {
    throw new Error('Expected schemas or user');
  }
} finally {
  await client.end();
}
