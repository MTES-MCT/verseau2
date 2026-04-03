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

/**
 * Tables excluded from pg_restore (too large / too slow).
 * Format: "dump_schema.table_name"
 *
 * These tables are NOT restored from the dump. Instead they are carried over
 * from the current live schema into the staging schema before the atomic swap.
 */
const EXCLUDED_TABLES = ['custom_ingestion_roseau.alr', 'custom_ingestion_roseau.ple', 'custom_ingestion_roseau.resj'];

module.exports = {
  DUMP_SCHEMAS,
  STAGING_SCHEMAS,
  LIVE_SCHEMAS,
  STAGING_TO_LIVE,
  DUMP_TO_STAGING,
  LIVE_TO_DUMP,
  EXCLUDED_TABLES,
};
