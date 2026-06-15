const fs = require('fs');
const path = require('path');
const config = require('./config');
const S3Service = require('./s3-service');
const PgService = require('./pg-service');
const SchemaManager = require('./schema-manager');
const { EXCLUDED_TABLES } = require('./schemas');
require('./server');

async function main() {
  let tempFilePath = null;

  const startedAt = new Date();

  try {
    if (!config.aws.bucket) {
      throw new Error('Missing S3 configuration. Please check .env file.');
    }
    if (!config.pg.connectionString) {
      throw new Error('Missing Postgres configuration. Please check .env file.');
    }

    const s3Service = new S3Service(config);
    const pgService = new PgService(config);
    const schemaManager = new SchemaManager(config);

    // Step 1: Download dump from S3 and verify contents
    console.log('=== Step 1/4: Download & verify dump ===');
    tempFilePath = await s3Service.downloadFile();
    console.log('Downloaded file:', tempFilePath);
    await pgService.verifyDumpContents(tempFilePath);

    if (EXCLUDED_TABLES.length > 0) {
      console.log(`\nExcluded tables (will be carried over from live): ${EXCLUDED_TABLES.join(', ')}`);
    }

    // Step 2: Clean up leftover staging schemas, then restore into _staging
    console.log('\n=== Step 2/4: Restore to staging schemas ===');
    await schemaManager.dropStagingSchemas();
    await pgService.restoreToStaging(tempFilePath);

    // Step 3: Validate staging schemas (tables exist, rows > 0)
    console.log('\n=== Step 3/4: Validate staging schemas ===');
    const rowCounts = await schemaManager.validateStagingSchemas();

    // Step 4: Atomic swap staging → live
    console.log('\n=== Step 4/4: Atomic swap ===');
    const dumpSource = path.basename(tempFilePath);
    await schemaManager.swapStagingToLive(dumpSource, rowCounts, startedAt);
    await schemaManager.createVSteuSclItvMaterializedView();

    // Cleanup temp file
    console.log('\nCleaning up temporary file...');
    if (tempFilePath) {
      fs.unlinkSync(tempFilePath);
    }
    console.log('Cleanup done.');

    console.log('\n✅ Sync process finished successfully!');
  } catch (error) {
    console.error('\n❌ Sync process failed:', error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      console.log('Cleaning up temporary file after error...');
      fs.unlinkSync(tempFilePath);
    }

    process.exit(1);
  }
}

main();
