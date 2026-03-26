const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require('pg');
const { DUMP_SCHEMAS, STAGING_SCHEMAS, EXCLUDED_TABLES } = require('./schemas');

/**
 * Parse EXCLUDED_TABLES into a map of schema → Set<table>.
 * @returns {Map<string, Set<string>>}
 */
function buildExclusionMap() {
  const map = new Map();
  for (const entry of EXCLUDED_TABLES) {
    const [schema, table] = entry.split('.');
    if (!map.has(schema)) map.set(schema, new Set());
    map.get(schema).add(table);
  }
  return map;
}

class PgService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Verify the dump contains the three required schemas.
   */
  async verifyDumpContents(filePath) {
    console.log(`Verifying dump contents for ${filePath}...`);
    const env = { ...process.env };
    const args = ['-l', filePath];

    return new Promise((resolve, reject) => {
      const listProcess = spawn('pg_restore', args, { env });
      let stdout = '';
      let stderr = '';

      listProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      listProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      listProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('pg_restore -l stderr:', stderr);
          return reject(new Error(`pg_restore -l exited with code ${code}`));
        }

        const missingSchemas = DUMP_SCHEMAS.filter((schema) => {
          const pattern = new RegExp(`\\b(SCHEMA\\s+-\\s+${schema}|[A-Z]+\\s+${schema}\\s+\\S+)\\b`);
          return !pattern.test(stdout);
        });

        if (missingSchemas.length > 0) {
          return reject(new Error(`Dump is missing required schemas: ${missingSchemas.join(', ')}`));
        }

        console.log('✅ Dump verification successful: all required schemas found.');
        resolve();
      });

      listProcess.on('error', (err) => reject(err));
    });
  }

  /**
   * Restore the dump into _staging schemas using a 3-section strategy to
   * completely skip excluded tables AND their indexes/constraints/triggers.
   *
   * Sections (pg_restore concept):
   *   pre-data  — CREATE TABLE, sequences, types, …
   *   data      — COPY / INSERT (the heavy part)
   *   post-data — indexes, constraints, triggers, …
   *
   * Steps:
   *   1. Drop & recreate original-named schemas
   *   2. Restore pre-data WITHOUT filtering (creates all table structures
   *      including excluded tables, so the catalog is populated)
   *   3. Query the restored catalog to discover index/constraint/trigger names
   *      that belong to excluded tables
   *   4. Restore data with a filtered TOC (skip TABLE DATA entries for excluded tables)
   *   5. Restore post-data with a filtered TOC (skip discovered dependent objects)
   *   6. Drop the empty excluded-table shells created by pre-data
   *   7. Rename schemas → _staging
   *   8. ANALYZE staging tables
   */
  async restoreToStaging(filePath) {
    const { connectionString } = this.config.pg;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    console.log(`Starting database restore from ${filePath}...`);

    // 1. Prepare schemas
    console.log('\n=== Preparing schemas for restore ===');
    await this._runPsql(
      connectionString,
      `
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      DROP SCHEMA IF EXISTS custom_ingestion_roseau CASCADE;
      DROP SCHEMA IF EXISTS custom_ingestion_lanceleau CASCADE;
      DROP SCHEMA IF EXISTS custom_ingestion_verseau CASCADE;
      CREATE SCHEMA custom_ingestion_roseau;
      CREATE SCHEMA custom_ingestion_lanceleau;
      CREATE SCHEMA custom_ingestion_verseau;
    `,
    );
    console.log('✅ Schemas prepared.');

    if (EXCLUDED_TABLES.length === 0) {
      // No exclusions — simple single-pass restore
      console.log('\n=== Restoring dump ===');
      await this._pgRestore(filePath, connectionString, []);
      console.log('\n=== Renaming schemas to staging ===');
      await this._renameToStaging(connectionString);
      console.log('\n=== Running ANALYZE on staging schemas ===');
      await this._analyzeStaging(connectionString);
      console.log('\nDatabase restore to staging completed successfully.');
      return;
    }

    // Get full TOC once
    const toc = await this._pgRestoreList(filePath);

    // 2. Restore pre-data UNFILTERED — creates all table structures including
    //    excluded tables, so the catalog is populated for step 3
    console.log('\n=== Section 1/3: Restoring pre-data ===');
    await this._pgRestore(filePath, connectionString, ['--section=pre-data']);

    // 3. Query the DB catalog to find all index/constraint/trigger names
    //    that belong to excluded tables (the table structures exist from
    //    pre-data, so the catalog knows about their dependent objects)
    console.log('\n=== Discovering dependent objects for excluded tables ===');
    const dependentNames = await this._findDependentObjectNames(connectionString);

    // 4. Restore data — filter out TABLE DATA entries for excluded tables
    //    (TABLE DATA lines use the format "schema tableName" and match directly)
    console.log('\n=== Section 2/3: Restoring data ===');
    const dataList = this._filterTocByTableName(toc, 'data');
    await this._pgRestore(filePath, connectionString, ['--section=data', '--use-list', dataList]);
    fs.unlinkSync(dataList);

    // 5. Restore post-data — filter out dependent indexes/constraints/triggers
    console.log('\n=== Section 3/3: Restoring post-data ===');
    const postDataList = this._filterTocPostData(toc, dependentNames);
    await this._pgRestore(filePath, connectionString, ['--section=post-data', '--use-list', postDataList]);
    fs.unlinkSync(postDataList);

    // 6. Drop the empty excluded-table shells created by pre-data
    console.log('\n=== Dropping excluded table shells ===');
    const dropSql = EXCLUDED_TABLES.map((entry) => `DROP TABLE IF EXISTS ${entry} CASCADE;`).join('\n');
    await this._runPsql(connectionString, dropSql);
    console.log(`✅ Dropped excluded table shells: ${EXCLUDED_TABLES.join(', ')}`);

    // 7. Rename to _staging
    console.log('\n=== Renaming schemas to staging ===');
    await this._renameToStaging(connectionString);

    // 8. ANALYZE staging tables
    console.log('\n=== Running ANALYZE on staging schemas ===');
    await this._analyzeStaging(connectionString);

    console.log('\nDatabase restore to staging completed successfully.');
  }

  // ── private helpers ──────────────────────────────────────────────

  /**
   * Get the pg_restore TOC listing as a string.
   */
  async _pgRestoreList(filePath) {
    const env = { ...process.env };

    return new Promise((resolve, reject) => {
      const proc = spawn('pg_restore', ['-l', filePath], { env });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error('pg_restore -l stderr:', stderr);
          return reject(new Error(`pg_restore -l exited with code ${code}`));
        }
        resolve(stdout);
      });

      proc.on('error', (err) => reject(err));
    });
  }

  /**
   * Filter TOC lines for pre-data and data sections.
   * These sections contain TABLE and TABLE DATA entries where the format is:
   *   id; catalogOid objectOid TYPE schema tableName owner
   * So "schema tableName" appears directly and can be matched.
   *
   * Returns path to a temp file with the filtered TOC.
   */
  _filterTocByTableName(toc, sectionLabel) {
    const lines = toc.split('\n');

    // Build patterns: match "schema tableName" as whole words
    const excludePatterns = EXCLUDED_TABLES.map((entry) => {
      const [schema, table] = entry.split('.');
      return new RegExp(`\\b${schema}\\s+${table}\\b`);
    });

    let excludedCount = 0;
    const filtered = lines.filter((line) => {
      if (line.startsWith(';') || line.trim() === '') return true;

      const excluded = excludePatterns.some((p) => p.test(line));
      if (excluded) {
        excludedCount++;
        console.log(`  [${sectionLabel}] Excluding: ${line.trim()}`);
        return false;
      }
      return true;
    });

    console.log(`  Filtered ${excludedCount} TOC entries for ${sectionLabel}`);

    const tmpFile = path.join(os.tmpdir(), `pg_restore_${sectionLabel.replace(/[^a-z]/g, '')}_${Date.now()}.list`);
    fs.writeFileSync(tmpFile, filtered.join('\n'));
    return tmpFile;
  }

  /**
   * Query the database catalog to find all index, constraint and trigger names
   * that belong to excluded tables.
   *
   * This must be called AFTER pre-data restore so the catalog is populated.
   *
   * @returns {Promise<Set<string>>} Set of "schema objectName" strings to exclude
   */
  async _findDependentObjectNames(connectionString) {
    const client = new Client({ connectionString });
    await client.connect();

    const dependentNames = new Set();
    const exclusionMap = buildExclusionMap();

    try {
      for (const [schema, tables] of exclusionMap.entries()) {
        const tableList = [...tables].map((t) => `'${t}'`).join(', ');

        // Indexes (includes unique constraints backed by indexes)
        const indexes = await client.query(
          `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = $1
            AND tablename IN (${tableList});
        `,
          [schema],
        );
        for (const row of indexes.rows) {
          dependentNames.add(`${schema} ${row.indexname}`);
        }

        // Constraints (FK, CHECK, etc.)
        const constraints = await client.query(
          `
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE nsp.nspname = $1
            AND rel.relname IN (${tableList});
        `,
          [schema],
        );
        for (const row of constraints.rows) {
          dependentNames.add(`${schema} ${row.conname}`);
        }

        // Triggers
        const triggers = await client.query(
          `
          SELECT trg.tgname
          FROM pg_trigger trg
          JOIN pg_class rel ON rel.oid = trg.tgrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE nsp.nspname = $1
            AND rel.relname IN (${tableList})
            AND NOT trg.tgisinternal;
        `,
          [schema],
        );
        for (const row of triggers.rows) {
          dependentNames.add(`${schema} ${row.tgname}`);
        }
      }

      console.log(`  Found ${dependentNames.size} dependent objects to exclude from post-data:`);
      for (const name of dependentNames) {
        console.log(`    ${name}`);
      }

      return dependentNames;
    } finally {
      await client.end();
    }
  }

  /**
   * Filter TOC for the post-data section.
   * Post-data entries (INDEX, CONSTRAINT, TRIGGER, etc.) use the format:
   *   id; catalogOid objectOid TYPE schema objectName owner
   * We exclude lines where "schema objectName" matches any dependent object.
   *
   * Returns path to a temp file with the filtered TOC.
   */
  _filterTocPostData(toc, dependentNames) {
    const lines = toc.split('\n');

    // Build patterns from the discovered dependent object names
    const excludePatterns = [...dependentNames].map((schemaAndName) => {
      const [schema, name] = schemaAndName.split(' ');
      return new RegExp(`\\b${schema}\\s+${name}\\b`);
    });

    let excludedCount = 0;
    const filtered = lines.filter((line) => {
      if (line.startsWith(';') || line.trim() === '') return true;

      const excluded = excludePatterns.some((p) => p.test(line));
      if (excluded) {
        excludedCount++;
        console.log(`  [post-data] Excluding: ${line.trim()}`);
        return false;
      }
      return true;
    });

    console.log(`  Filtered ${excludedCount} TOC entries for post-data`);

    const tmpFile = path.join(os.tmpdir(), `pg_restore_postdata_${Date.now()}.list`);
    fs.writeFileSync(tmpFile, filtered.join('\n'));
    return tmpFile;
  }

  /**
   * Run pg_restore with the given extra arguments.
   */
  async _pgRestore(filePath, connectionString, extraArgs) {
    const env = { ...process.env };

    const args = [
      '--verbose',
      '--no-owner',
      '--no-acl',
      '--schema=custom_ingestion_roseau',
      '--schema=custom_ingestion_lanceleau',
      '--schema=custom_ingestion_verseau',
      ...extraArgs,
      '-d',
      connectionString,
      filePath,
    ];

    return new Promise((resolve, reject) => {
      const restoreProcess = spawn('pg_restore', args, { env });

      let stderr = '';

      restoreProcess.stdout.on('data', (data) => {
        console.log(`pg_restore: ${data}`);
      });

      restoreProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`pg_restore: ${data}`);
      });

      restoreProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ pg_restore completed successfully.');
          resolve();
        } else {
          console.error('pg_restore stderr:', stderr);
          reject(new Error(`pg_restore exited with code ${code}`));
        }
      });

      restoreProcess.on('error', (err) => reject(err));
    });
  }

  async _renameToStaging(connectionString) {
    const renameSql = DUMP_SCHEMAS.map((schema, i) => `ALTER SCHEMA ${schema} RENAME TO ${STAGING_SCHEMAS[i]};`).join(
      '\n',
    );
    await this._runPsql(connectionString, renameSql);
    console.log('✅ Schemas renamed to staging.');
  }

  async _analyzeStaging(connectionString) {
    const schemaList = STAGING_SCHEMAS.map((s) => `'${s}'`).join(', ');

    const sql = `
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT schemaname, tablename
          FROM pg_tables
          WHERE schemaname IN (${schemaList})
        LOOP
          RAISE NOTICE 'ANALYZE %.%', r.schemaname, r.tablename;
          EXECUTE format('ANALYZE %I.%I', r.schemaname, r.tablename);
        END LOOP;
      END
      $$;
    `;

    await this._runPsql(connectionString, sql);
    console.log('✅ ANALYZE completed on all staging schemas.');
  }

  /**
   * Run an arbitrary SQL string via psql.
   */
  async _runPsql(connectionString, sql) {
    const env = { ...process.env };

    return new Promise((resolve, reject) => {
      const args = ['-d', connectionString, '-c', sql];
      const psqlProcess = spawn('psql', args, { env });

      psqlProcess.stderr.on('data', (data) => {
        console.log(`  ${data}`);
      });

      psqlProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      psqlProcess.on('error', (err) => reject(err));
    });
  }
}

module.exports = PgService;
