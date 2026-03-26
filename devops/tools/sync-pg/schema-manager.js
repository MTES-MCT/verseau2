const { Client } = require('pg');
const { STAGING_SCHEMAS, STAGING_TO_LIVE, LIVE_TO_DUMP, EXCLUDED_TABLES } = require('./schemas');

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
   * Drop _staging schemas if they exist (leftover from a failed previous run).
   */
  async dropStagingSchemas() {
    console.log('Dropping leftover staging schemas if they exist...');
    const client = await this._getClient();

    try {
      for (const schema of STAGING_SCHEMAS) {
        await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
      }
      console.log('✅ Staging schemas cleaned up.');
    } finally {
      await client.end();
    }
  }

  /**
   * Validate that every staging schema exists, contains tables, and every
   * non-excluded table has at least one row.
   *
   * Excluded tables are skipped — they haven't been restored and will be
   * carried over from the live schema during the swap.
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
   * 1. Carry over excluded tables from live → staging
   * 2. Drop live schemas
   * 3. Rename staging → live
   * 4. Record swap in public.sync_tracking
   *
   * @param {string}                  dumpSource - Identifier of the dump file
   * @param {Record<string, number>}  rowCounts  - Row-count snapshot from validation
   */
  async swapStagingToLive(dumpSource, rowCounts) {
    console.log('Performing atomic schema swap...');
    const client = await this._getClient();

    try {
      await client.query('BEGIN');

      // Ensure tracking table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.sync_tracking (
          id          SERIAL PRIMARY KEY,
          restored_at TIMESTAMP NOT NULL DEFAULT NOW(),
          dump_source TEXT NOT NULL,
          row_counts  JSONB NOT NULL
        );
      `);

      // Carry over excluded tables from live into staging
      await this._carryOverExcludedTables(client, rowCounts);

      // Drop live schemas and rename staging → live
      for (const stagingSchema of STAGING_SCHEMAS) {
        const liveSchema = STAGING_TO_LIVE[stagingSchema];
        await client.query(`DROP SCHEMA IF EXISTS ${liveSchema} CASCADE;`);
        await client.query(`ALTER SCHEMA ${stagingSchema} RENAME TO ${liveSchema};`);
        console.log(`  ${stagingSchema} → ${liveSchema}`);
      }

      // Record the swap
      await client.query(
        `INSERT INTO public.sync_tracking (restored_at, dump_source, row_counts)
         VALUES (NOW(), $1, $2);`,
        [dumpSource, JSON.stringify(rowCounts)],
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

  /**
   * For each excluded table, copy it from the current live schema into the
   * staging schema (CREATE TABLE ... AS SELECT * ...), so it survives the
   * DROP SCHEMA live CASCADE.
   *
   * Also records their row counts in the rowCounts map for auditing.
   *
   * @param {Client} client   - Already-connected client inside a transaction
   * @param {Record<string, number>} rowCounts - Mutable map to append to
   */
  async _carryOverExcludedTables(client, rowCounts) {
    if (EXCLUDED_TABLES.length === 0) return;

    console.log('Carrying over excluded tables from live to staging...');

    for (const entry of EXCLUDED_TABLES) {
      const [dumpSchema, table] = entry.split('.');

      // Find the matching staging/live schemas for this dump schema
      let stagingSchema = null;
      let liveSchema = null;

      for (const [staging, live] of Object.entries(STAGING_TO_LIVE)) {
        if (LIVE_TO_DUMP[live] === dumpSchema) {
          stagingSchema = staging;
          liveSchema = live;
          break;
        }
      }

      if (!stagingSchema) {
        console.log(`  ⚠️ No matching staging schema for ${entry}, skipping.`);
        continue;
      }

      // Check if the table exists in the live schema (first run it won't)
      const exists = await client.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = $2
         );`,
        [liveSchema, table],
      );

      if (!exists.rows[0].exists) {
        console.log(`  ${liveSchema}.${table}: not found in live schema, skipping carry-over.`);
        continue;
      }

      // Copy table structure + data into staging
      await client.query(`CREATE TABLE ${stagingSchema}.${table} (LIKE ${liveSchema}.${table} INCLUDING ALL);`);
      await client.query(`INSERT INTO ${stagingSchema}.${table} SELECT * FROM ${liveSchema}.${table};`);

      // Record row count
      const countResult = await client.query(`SELECT COUNT(*) AS count FROM ${stagingSchema}.${table};`);
      const count = parseInt(countResult.rows[0].count, 10);
      const key = `${liveSchema}.${table}`;
      rowCounts[key] = count;

      console.log(`  ${liveSchema}.${table} → ${stagingSchema}.${table}: ${count} rows carried over`);
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
         AND table_type = 'BASE TABLE'
       ORDER BY table_name;`,
      [schemaName],
    );
    return result.rows.map((row) => row.table_name);
  }
}

module.exports = SchemaManager;
