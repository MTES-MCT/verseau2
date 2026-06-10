/**
 * Shared schema constants used by pg-service and schema-manager.
 */

/** Schema names as they appear inside the dump file. */
const DUMP_SCHEMAS = ['custom_ingestion_roseau', 'custom_ingestion_lanceleau', 'custom_ingestion_verseau'];

/** Intermediate staging schema names (dump schemas get renamed to these). */
const STAGING_SCHEMAS = [
  'custom_ingestion_roseau_staging',
  'custom_ingestion_lanceleau_staging',
  'custom_ingestion_verseau_staging',
];

/** Final live schema names that the application queries. */
const LIVE_SCHEMAS = ['roseau', 'lanceleau', 'verseau'];

/** Maps each staging schema to its live counterpart. */
const STAGING_TO_LIVE = Object.fromEntries(STAGING_SCHEMAS.map((s, i) => [s, LIVE_SCHEMAS[i]]));

/** Maps each dump schema to its staging counterpart. */
const DUMP_TO_STAGING = Object.fromEntries(DUMP_SCHEMAS.map((s, i) => [s, STAGING_SCHEMAS[i]]));

/** Maps each live schema back to its dump-file schema name. */
const LIVE_TO_DUMP = Object.fromEntries(LIVE_SCHEMAS.map((s, i) => [s, DUMP_SCHEMAS[i]]));

function parseExcludedTables() {
  const rawValue = process.env.SYNC_PG_EXCLUDED_TABLES;

  if (!rawValue || rawValue.trim() === '') {
    throw new Error(
      'SYNC_PG_EXCLUDED_TABLES is required. Expected comma-separated values in format "dump_schema.table_name".',
    );
  }

  const tables = rawValue.split(',').map((value) => value.trim());

  if (tables.some((table) => table === '')) {
    throw new Error(
      'SYNC_PG_EXCLUDED_TABLES must contain only non-empty comma-separated values in format "dump_schema.table_name".',
    );
  }

  const invalidTables = tables.filter((table) => !/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(table));
  if (invalidTables.length > 0) {
    throw new Error(
      `Invalid SYNC_PG_EXCLUDED_TABLES value(s): ${invalidTables.join(', ')}. Expected format "dump_schema.table_name".`,
    );
  }

  return tables;
}

/**
 * Tables excluded from pg_restore (too large / too slow).
 * Configured via SYNC_PG_EXCLUDED_TABLES.
 * Format: comma-separated values using "dump_schema.table_name".
 * Example: SYNC_PG_EXCLUDED_TABLES=custom_ingestion_roseau.alr,custom_ingestion_roseau.ple
 *
 * These tables are NOT restored from the dump. Instead they are carried over
 * from the current live schema into the staging schema before the atomic swap.
 */
const EXCLUDED_TABLES = parseExcludedTables();

module.exports = {
  DUMP_SCHEMAS,
  STAGING_SCHEMAS,
  LIVE_SCHEMAS,
  STAGING_TO_LIVE,
  DUMP_TO_STAGING,
  LIVE_TO_DUMP,
  EXCLUDED_TABLES,
};
