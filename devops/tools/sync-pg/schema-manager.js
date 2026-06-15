const { Client } = require('pg');
const { DUMP_SCHEMAS, STAGING_SCHEMAS, STAGING_TO_LIVE, LIVE_TO_DUMP, EXCLUDED_TABLES } = require('./schemas');

/**
 * Returns a Set of table names excluded for a given dump schema.
 * @param {string} dumpSchema e.g. "custom_ingestion_roseau"
 * @returns {Set<string>}
 */
function excludedTablesForDumpSchema(dumpSchema) {
  const tables = new Set();
  for (const entry of EXCLUDED_TABLES) {
    const [schema, table] = entry.split('.');
    if (schema === dumpSchema) {
      tables.add(table);
    }
  }
  return tables;
}

class SchemaManager {
  constructor(config) {
    this.config = config;
  }

  async _getClient() {
    const client = new Client({
      connectionString: this.config.pg.connectionString,
    });
    await client.connect();
    return client;
  }

  /**
   * Drop leftover work schemas from a failed previous run:
   * - _staging schemas (renamed from dump schemas, not yet swapped)
   * - custom_ingestion_* dump schemas (created but not yet renamed to staging)
   */
  async dropStagingSchemas() {
    console.log('Dropping leftover staging/dump schemas if they exist...');
    const client = await this._getClient();

    try {
      for (const schema of [...STAGING_SCHEMAS, ...DUMP_SCHEMAS]) {
        await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
      }
      console.log('✅ Leftover schemas cleaned up.');
    } finally {
      await client.end();
    }
  }

  /**
   * Validate that every staging schema exists, contains tables, and every
   * non-excluded table has at least one row.
   *
   * Excluded tables are skipped — they haven't been restored and will be
   * moved from the live schema via ALTER TABLE SET SCHEMA during the swap.
   *
   * @returns {Promise<Record<string, number>>} Map of "liveSchema.table" → row count
   */
  async validateStagingSchemas() {
    console.log('Validating staging schemas...');
    const client = await this._getClient();
    /** @type {Record<string, number>} */
    const rowCounts = {};

    try {
      for (const stagingSchema of STAGING_SCHEMAS) {
        const liveSchema = STAGING_TO_LIVE[stagingSchema];
        const dumpSchema = LIVE_TO_DUMP[liveSchema];
        const excluded = excludedTablesForDumpSchema(dumpSchema);

        const tables = await this._getTablesFromSchema(client, stagingSchema);

        if (tables.length === 0) {
          throw new Error(`Schema ${stagingSchema} contains no tables!`);
        }

        for (const table of tables) {
          if (excluded.has(table)) {
            console.log(`  ${liveSchema}.${table}: SKIPPED (excluded from restore)`);
            continue;
          }

          const result = await client.query(`SELECT COUNT(*) AS count FROM ${stagingSchema}.${table};`);
          const count = parseInt(result.rows[0].count, 10);

          if (count === 0) {
            throw new Error(`Table ${stagingSchema}.${table} is empty!`);
          }

          const key = `${liveSchema}.${table}`;
          rowCounts[key] = count;
          console.log(`  ${key}: ${count} rows`);
        }
      }

      console.log('✅ All staging schemas validated.');
      return rowCounts;
    } finally {
      await client.end();
    }
  }

  /**
   * Atomic swap: within a single transaction —
   * 1. Rename live → _old
   * 2. Rename staging → live
   * 3. Move excluded tables from _old → live (ALTER TABLE SET SCHEMA — instant, metadata-only)
   * 4. Drop _old schemas
   * 5. Record swap in public.sync_tracking
   *
   * @param {string}                  dumpSource - Identifier of the dump file
   * @param {Record<string, number>}  rowCounts  - Row-count snapshot from validation
   * @param {Date}                    startedAt  - When the sync process started
   */
  async swapStagingToLive(dumpSource, rowCounts, startedAt) {
    console.log('Performing atomic schema swap...');
    const client = await this._getClient();

    try {
      await client.query('BEGIN');

      // Ensure tracking table exists with current schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.sync_tracking (
          id            SERIAL PRIMARY KEY,
          started_at    TIMESTAMP NOT NULL,
          finished_at   TIMESTAMP NOT NULL DEFAULT NOW(),
          duration      INTERVAL NOT NULL,
          dump_source   TEXT NOT NULL,
          row_counts    JSONB NOT NULL
        );
      `);

      const oldSchemas = [];

      for (const stagingSchema of STAGING_SCHEMAS) {
        const liveSchema = STAGING_TO_LIVE[stagingSchema];
        const oldSchema = `${liveSchema}_old`;
        const dumpSchema = LIVE_TO_DUMP[liveSchema];
        const excluded = excludedTablesForDumpSchema(dumpSchema);

        // Check if the live schema exists (first run it won't)
        const liveExists = await client.query(
          `SELECT EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = $1);`,
          [liveSchema],
        );

        if (liveExists.rows[0].exists) {
          // Park the current live schema
          await client.query(`DROP SCHEMA IF EXISTS ${oldSchema} CASCADE;`);
          await client.query(`ALTER SCHEMA ${liveSchema} RENAME TO ${oldSchema};`);
          console.log(`  ${liveSchema} → ${oldSchema}`);

          // Promote staging to live
          await client.query(`ALTER SCHEMA ${stagingSchema} RENAME TO ${liveSchema};`);
          console.log(`  ${stagingSchema} → ${liveSchema}`);

          // Move excluded tables from _old into the new live schema (instant metadata operation)
          for (const table of excluded) {
            const tableExists = await client.query(
              `SELECT EXISTS (
                 SELECT FROM information_schema.tables
                 WHERE table_schema = $1 AND table_name = $2
               );`,
              [oldSchema, table],
            );

            if (tableExists.rows[0].exists) {
              // Drop the empty shell left by pre-data restore in the new live schema
              await client.query(`DROP TABLE IF EXISTS ${liveSchema}.${table} CASCADE;`);
              // Move the real table (instant, metadata-only)
              await client.query(`ALTER TABLE ${oldSchema}.${table} SET SCHEMA ${liveSchema};`);

              const countResult = await client.query(`SELECT COUNT(*) AS count FROM ${liveSchema}.${table};`);
              const count = parseInt(countResult.rows[0].count, 10);
              rowCounts[`${liveSchema}.${table}`] = count;
              console.log(`  ${oldSchema}.${table} → ${liveSchema}.${table}: ${count} rows (SET SCHEMA, instant)`);
            } else {
              console.log(`  ${oldSchema}.${table}: not found, skipping.`);
            }
          }

          oldSchemas.push(oldSchema);
        } else {
          // First run: no live schema to park, just rename staging
          await client.query(`ALTER SCHEMA ${stagingSchema} RENAME TO ${liveSchema};`);
          console.log(`  ${stagingSchema} → ${liveSchema} (first run, no carry-over needed)`);
        }
      }

      // Drop _old schemas (excluded tables have already been moved out)
      for (const oldSchema of oldSchemas) {
        await client.query(`DROP SCHEMA ${oldSchema} CASCADE;`);
        console.log(`  Dropped ${oldSchema}`);
      }

      // Record the swap (excluded tables are not part of the restore, omit from row_counts)
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const durationSecs = Math.round(durationMs / 1000);

      const filteredRowCounts = { ...rowCounts };
      for (const entry of EXCLUDED_TABLES) {
        const [dumpSchema, table] = entry.split('.');
        for (const [, live] of Object.entries(STAGING_TO_LIVE)) {
          if (LIVE_TO_DUMP[live] === dumpSchema) {
            delete filteredRowCounts[`${live}.${table}`];
          }
        }
      }

      await client.query(
        `INSERT INTO public.sync_tracking (started_at, finished_at, duration, dump_source, row_counts)
         VALUES ($1, $2, make_interval(secs => $3), $4, $5);`,
        [startedAt, finishedAt, durationSecs, dumpSource, JSON.stringify(filteredRowCounts)],
      );

      await client.query('COMMIT');
      console.log('✅ Atomic swap completed.');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Swap failed, rolled back:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async createVSteuSclItvMaterializedView() {
    console.log('Creating verseau.mv_steu_scl_itv materialized view...');
    const client = await this._getClient();

    try {
      console.log('Dropping existing materialized view verseau.mv_steu_scl_itv if it exists...');
      await client.query(`DROP MATERIALIZED VIEW IF EXISTS verseau.mv_steu_scl_itv;`);
      console.log('Creating new materialized view verseau.mv_steu_scl_itv ...');
      await client.query(`
        CREATE MATERIALIZED VIEW verseau.mv_steu_scl_itv AS
        SELECT *
        FROM verseau.v_steu_scl_itv;
      `);
      console.log('Creating indexes on materialized view verseau.mv_steu_scl_itv...');
      await client.query(`CREATE INDEX idx_mv_steu_scl_itv_steu_cda ON verseau.mv_steu_scl_itv (steu_cda);`);
      await client.query(`CREATE INDEX idx_mv_steu_scl_itv_scl_cda ON verseau.mv_steu_scl_itv (scl_cda);`);
      await client.query(`CREATE INDEX idx_mv_steu_scl_itv_mo_itv_rfa ON verseau.mv_steu_scl_itv (mo_itv_rfa);`);
      await client.query(`CREATE INDEX idx_mv_steu_scl_itv_sat_itv_rfa ON verseau.mv_steu_scl_itv (sat_itv_rfa);`);
      await client.query(`CREATE INDEX idx_mv_steu_scl_itv_ae_itv_rfa ON verseau.mv_steu_scl_itv (ae_itv_rfa);`);
      console.log('✅ verseau.mv_steu_scl_itv materialized view created.');
    } finally {
      await client.end();
    }
  }

  /**
   * @param {Client} client
   * @param {string} schemaName
   * @returns {Promise<string[]>}
   */
  async _getTablesFromSchema(client, schemaName) {
    const result = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_type IN ('BASE TABLE', 'VIEW')
       ORDER BY table_name;`,
      [schemaName],
    );
    return result.rows.map((row) => row.table_name);
  }
}

module.exports = SchemaManager;
