import { Client } from 'pg';
import { createReferentielDataset, seedSteu, seedScl, seedTlref } from '../../../apps/back/test/createReferentielDataset.ts';
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
    // The dashboard's STEU indicators query needs more columns than the
    // shared referential fixture uses. Keep them local to the browser stack.
    await database.query(`
      ALTER TABLE roseau.cxntech
        ADD COLUMN aval_steu_cdn INTEGER,
        ADD COLUMN cxntech_creation_dt TIMESTAMP;
      ALTER TABLE roseau.aga
        ADD COLUMN aga_dep_rfa VARCHAR,
        ADD COLUMN aga_nom_lb VARCHAR,
        ADD COLUMN aga_cdb_rfa VARCHAR,
        ADD COLUMN aga_reg_rfa VARCHAR,
        ADD COLUMN tlref_64_cdn INTEGER,
        ADD COLUMN tlref_03_cdn INTEGER;
      CREATE TABLE roseau.agat (
        aga_cdn INTEGER, agat_taille_an NUMERIC,
        agat_cbpo_val NUMERIC, agat_ent_calc_max_chg_som_val NUMERIC
      );
      CREATE TABLE roseau.sclconf (
        scl_cdn INTEGER, sclconf_an NUMERIC,
        sclconf_eru_eval_tp_val_dt TIMESTAMP,
        sclconf_eru_eval_vol_5ans_pc NUMERIC,
        sclconf_eru_eval_flux_5ans_pc NUMERIC,
        sclconf_eru_eval_j_dv_5ans_nb NUMERIC
      );
      CREATE TABLE lanceleau.cdb (cdb_rfa VARCHAR, cdb_nom_lb VARCHAR);
      CREATE TABLE lanceleau.reg (reg_rfa VARCHAR, reg_lb VARCHAR);
    `);
  } else if (process.argv[2] === 'user') {
    const [{ userTable }] = await database.query(`SELECT to_regclass('public."user"') AS "userTable"`);
    if (!userTable) {
      throw new Error('The E2E database is missing public."user" after API startup. Check artifacts/logs/api.log for TypeORM schema initialization.');
    }
    await seedUserWithDroits(database, {
      sub: 'e2e-user',
      uid: 'cerbere-e2e-user',
      email: 'e2e@example.com',
      itvCdn: 100,
      itvRfa: '12345678901234',
    });
    await seedSteu(database, 1000, 'TEST_STEU_001');
    await seedScl(database, 1001, 'TEST_SCL_001');
    await seedTlref(database, 2004, 'LREF_01', '4', 'Type d’ouvrage de test');
    await seedVSteuSclItv(database, 'TEST_STEU_001', 'TEST_SCL_001', '12345678901234');
  } else {
    throw new Error('Expected schemas or user');
  }
} finally {
  await client.end();
}
