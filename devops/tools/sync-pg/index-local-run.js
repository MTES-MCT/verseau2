const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');
const dotenv = require('dotenv');

const samplePath = path.join(__dirname, 'db', 'lanceleau_dump_20260913_sample');
const localEnvPath = path.join(__dirname, '.env.local');
const testEnvPath = path.join(__dirname, '.env.test');

function quoteIdentifier(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

async function runSync(env) {
  await new Promise((resolve, reject) => {
    // index.js starts a health server; close it so the local child exits after main().
    const child = spawn(process.execPath, ['-e', 'require("./index.js"); require("./server").close();'], {
      cwd: __dirname,
      env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`index.js exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
    });
  });
}

async function main() {
  let s3;
  let bucket;
  let key;
  let uploaded = false;
  let databaseName;
  let error;

  try {
    const localEnv = dotenv.config({ path: localEnvPath, override: true, quiet: true });
    if (localEnv.error) {
      throw new Error(`Could not load ${localEnvPath}: ${localEnv.error.message}`);
    }
    // Read overrides without applying them to the S3 settings from .env.local.
    const testEnv = dotenv.config({ path: testEnvPath, processEnv: {}, quiet: true });
    if (testEnv.error || !testEnv.parsed?.DATABASE_URL) {
      throw new Error(`DATABASE_URL is required in ${testEnvPath}`);
    }
    if (testEnv.parsed.S3_DUMP_FOLDER !== 'dump_test') {
      throw new Error(`S3_DUMP_FOLDER=dump_test is required in ${testEnvPath}`);
    }
    const missingS3Variables = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']
      .filter((name) => !process.env[name]);
    if (missingS3Variables.length > 0) {
      throw new Error(`Missing S3 configuration: ${missingS3Variables.join(', ')}. Set these in ${localEnvPath} (and set S3_ENDPOINT for a custom S3 service).`);
    }
    if (!fs.existsSync(samplePath)) {
      throw new Error(`Sample dump not found: ${samplePath}`);
    }

    const adminConnectionString = testEnv.parsed.DATABASE_URL;
    databaseName = `sync_pg_test_${randomUUID().replaceAll('-', '')}`;
    const adminClient = new Client({ connectionString: adminConnectionString });
    try {
      await adminClient.connect();
      await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    } finally {
      await adminClient.end();
    }

    const databaseUrl = new URL(adminConnectionString);
    databaseUrl.pathname = `/${databaseName}`;
    console.log(`Test database created: ${databaseName} on ${databaseUrl.host} (preserved after the run).`);

    bucket = process.env.S3_BUCKET;
    key = `${testEnv.parsed.S3_DUMP_FOLDER}/${path.basename(samplePath)}`;
    s3 = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
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

    await runSync({
      ...process.env,
      S3_DUMP_FOLDER: testEnv.parsed.S3_DUMP_FOLDER,
      DATABASE_URL: databaseUrl.toString(),
    });
    console.log(`✅ Sync finished; database ${databaseName} is available for inspection.`);
  } catch (cause) {
    error = cause;
    console.error('❌ Local sync test failed:', cause);
  } finally {
    if (uploaded) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        console.log(`Removed s3://${bucket}/${key}.`);
      } catch (cause) {
        error ??= cause;
        console.error(`❌ Could not remove s3://${bucket}/${key}:`, cause);
      }
    }
    s3?.destroy();
  }

  if (error) process.exitCode = 1;
}

main();
