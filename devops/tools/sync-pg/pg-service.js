const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DUMP_SCHEMAS, STAGING_SCHEMAS, EXCLUDED_TABLES } = require('./schemas');

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
   * Restore the dump into _staging schemas.
   *
   * Steps:
   * 1. Drop & recreate original-named schemas so pg_restore can populate them
   * 2. Generate a filtered TOC that excludes EXCLUDED_TABLES
   * 3. pg_restore the dump using the filtered list
   * 4. Rename restored schemas → _staging
   * 5. ANALYZE all staging tables
   */
  async restoreToStaging(filePath) {
    const { connectionString } = this.config.pg;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    console.log(`Starting database restore from ${filePath}...`);

    // 1. Drop original-named schemas so pg_restore can recreate them
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

    // 2. Build filtered TOC (exclude large tables)
    console.log('\n=== Building filtered restore list ===');
    const filteredListPath = await this._buildFilteredList(filePath);

    // 3. pg_restore using the filtered list
    console.log('\n=== Restoring dump ===');
    await this._restoreDump(filePath, connectionString, filteredListPath);

    // Clean up temp list file
    fs.unlinkSync(filteredListPath);

    // 4. Rename to _staging
    console.log('\n=== Renaming schemas to staging ===');
    const renameSql = DUMP_SCHEMAS.map((schema, i) => `ALTER SCHEMA ${schema} RENAME TO ${STAGING_SCHEMAS[i]};`).join(
      '\n',
    );
    await this._runPsql(connectionString, renameSql);
    console.log('✅ Schemas renamed to staging.');

    // 5. ANALYZE staging tables
    console.log('\n=== Running ANALYZE on staging schemas ===');
    await this._analyzeStaging(connectionString);

    console.log('\nDatabase restore to staging completed successfully.');
  }

  // ── private helpers ──────────────────────────────────────────────

  /**
   * Run `pg_restore -l` to get the TOC, then remove lines that reference
   * any of the EXCLUDED_TABLES. Write the filtered TOC to a temp file and
   * return its path.
   */
  async _buildFilteredList(filePath) {
    const toc = await this._pgRestoreList(filePath);
    const lines = toc.split('\n');

    // Build regex patterns for each excluded table.
    // TOC lines look like:
    //   1234; 1259 16389 TABLE custom_ingestion_roseau alr postgres
    //   5678; 0 16389 TABLE DATA custom_ingestion_roseau alr postgres
    //   9012; 2606 16400 CONSTRAINT custom_ingestion_roseau alr_pkey postgres
    //   etc.
    const excludePatterns = EXCLUDED_TABLES.map((entry) => {
      const [schema, table] = entry.split('.');
      // Match the table name as a whole word right after the schema name
      return new RegExp(`\\b${schema}\\s+${table}\\b`);
    });

    let excludedCount = 0;
    const filtered = lines.filter((line) => {
      // Keep comment lines (starting with ;) and empty lines
      if (line.startsWith(';') || line.trim() === '') return true;

      const excluded = excludePatterns.some((pattern) => pattern.test(line));
      if (excluded) {
        excludedCount++;
        console.log(`  Excluding: ${line.trim()}`);
        return false;
      }
      return true;
    });

    console.log(`✅ Filtered TOC: excluded ${excludedCount} entries for tables: ${EXCLUDED_TABLES.join(', ')}`);

    const tmpFile = path.join(os.tmpdir(), `pg_restore_filtered_${Date.now()}.list`);
    fs.writeFileSync(tmpFile, filtered.join('\n'));
    return tmpFile;
  }

  /**
   * Get the pg_restore TOC listing as a string.
   */
  async _pgRestoreList(filePath) {
    const env = { ...process.env };
    const args = ['-l', filePath];

    return new Promise((resolve, reject) => {
      const proc = spawn('pg_restore', args, { env });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
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

  async _restoreDump(filePath, connectionString, filteredListPath) {
    const env = { ...process.env };

    const args = [
      '--verbose',
      '--no-owner',
      '--no-acl',
      '--use-list',
      filteredListPath,
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
          console.log('✅ Dump restored successfully.');
          resolve();
        } else {
          console.error('pg_restore stderr:', stderr);
          reject(new Error(`pg_restore exited with code ${code}`));
        }
      });

      restoreProcess.on('error', (err) => reject(err));
    });
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
