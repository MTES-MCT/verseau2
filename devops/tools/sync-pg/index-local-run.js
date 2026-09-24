const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');
const dotenv = require('dotenv');

const samplePath = path.join(__dirname, 'db', 'lanceleau_dump_20260913_sample');

async function main() {
  const localEnvPath = path.join(__dirname, '.env.local');
  const testEnvPath = path.join(__dirname, '.env.test');
  const localEnv = dotenv.config({ path: localEnvPath, override: true, quiet: true });
  if (localEnv.error) throw localEnv.error;

  const testEnv = dotenv.config({ path: testEnvPath, processEnv: {}, quiet: true });
  if (testEnv.error || !testEnv.parsed?.DATABASE_URL) {
    throw new Error(`DATABASE_URL is required in ${testEnvPath}`);
  }
  if (testEnv.parsed.S3_DUMP_FOLDER !== 'dump_test') {
    throw new Error(`S3_DUMP_FOLDER=dump_test is required in ${testEnvPath}`);
  }
  const missingS3 = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']
    .filter((name) => !process.env[name]);
  if (missingS3.length) throw new Error(`Missing S3 configuration in ${localEnvPath}: ${missingS3.join(', ')}`);
  if (!fs.existsSync(samplePath)) throw new Error(`Sample dump not found: ${samplePath}`);

  // The generated name contains only ASCII letters, digits and underscores.
  const databaseName = `sync_pg_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ connectionString: testEnv.parsed.DATABASE_URL });
  const databaseUrl = new URL(testEnv.parsed.DATABASE_URL);
  databaseUrl.pathname = `/${databaseName}`;

  const bucket = process.env.S3_BUCKET;
  const key = `dump_test/${path.basename(samplePath)}`;
  let s3;
  let databaseCreated = false;
  let uploaded = false;
  let error;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${databaseName}`);
    databaseCreated = true;
    console.log(`Test database created: ${databaseName} on ${databaseUrl.host}.`);

    s3 = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    console.log(`Uploading sample to s3://${bucket}/${key}...`);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(samplePath),
      ContentLength: fs.statSync(samplePath).size,
      IfNoneMatch: '*',
    }));
    uploaded = true;

    // index.js runs the sync and sends its Tchap report; close its health server so the child exits.
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', 'require("./index.js"); require("./server").close();'], {
        cwd: __dirname,
        env: { ...process.env, DATABASE_URL: databaseUrl.toString(), S3_DUMP_FOLDER: 'dump_test' },
        stdio: 'inherit',
      });
      child.on('error', reject);
      child.on('close', (code, signal) => {
        if (code === 0) resolve();
        else reject(new Error(`index.js exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
      });
    });
  } catch (cause) {
    error = cause;
  } finally {
    if (uploaded) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        console.log(`Removed s3://${bucket}/${key}.`);
      } catch (cause) {
        error ??= cause;
        console.error(`Could not remove s3://${bucket}/${key}:`, cause);
      }
    }
    s3?.destroy();
    if (databaseCreated) {
      try {
        await admin.query(`DROP DATABASE ${databaseName} WITH (FORCE)`);
        console.log(`Removed test database ${databaseName}.`);
      } catch (cause) {
        error ??= cause;
        console.error(`Could not remove test database ${databaseName}:`, cause);
      }
    }
    try {
      await admin.end();
    } catch (cause) {
      error ??= cause;
      console.error('Could not close PostgreSQL connection:', cause);
    }
  }

  if (error) throw error;
  console.log('✅ Local sync test finished and temporary resources removed.');
}

main().catch((error) => {
  console.error('❌ Local sync test failed:', error);
  process.exitCode = 1;
});
