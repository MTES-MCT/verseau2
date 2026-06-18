#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { Blob } = require('node:buffer');

const repoRoot = path.resolve(__dirname, '..');
const defaultApiBaseUrl = 'http://localhost:3000/api';
const defaultUploadDelayMs = 3500;
const defaultUploadTimeoutMs = 120000;

function printUsage() {
  console.log(`Usage:
  ADMIN_ACCESS_TOKEN="..." node scripts/upload_xml.js
  ADMIN_COOKIE="access_token=..." node scripts/upload_xml.js
  node scripts/upload_xml.js --dry-run

Options:
  --dry-run       List XML files without uploading them.
  --help         Show this help.

Environment:
  API_BASE_URL          API base URL. Default: ${defaultApiBaseUrl}
  ADMIN_ACCESS_TOKEN    Admin access token value sent as the access_token cookie.
  ADMIN_COOKIE          Full Cookie header. Takes precedence over ADMIN_ACCESS_TOKEN.
  XML_DIR               XML directory. Default: <repo>/scripts/xml
  UPLOAD_DELAY_MS       Delay between uploads. Default: ${defaultUploadDelayMs}
  UPLOAD_TIMEOUT_MS     Per-file request timeout. Default: ${defaultUploadTimeoutMs}`);
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function parsePositiveIntegerEnv(name, defaultValue) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a positive integer or 0`);
  }

  return parsed;
}

function buildCookieHeader() {
  const adminCookie = process.env.ADMIN_COOKIE?.trim();
  if (adminCookie) {
    return adminCookie;
  }

  const adminAccessToken = process.env.ADMIN_ACCESS_TOKEN?.trim();
  if (!adminAccessToken) {
    throw new Error('Missing ADMIN_ACCESS_TOKEN or ADMIN_COOKIE');
  }

  return adminAccessToken.startsWith('access_token=') ? adminAccessToken : `access_token=${adminAccessToken}`;
}

function buildUploadUrl() {
  const apiBaseUrl = process.env.API_BASE_URL?.trim() || defaultApiBaseUrl;
  return `${apiBaseUrl.replace(/\/+$/, '')}/depot/upload`;
}

function getXmlDirectory() {
  const configuredDirectory = process.env.XML_DIR?.trim();
  return configuredDirectory ? path.resolve(configuredDirectory) : path.join(repoRoot, 'scripts', 'xml');
}

async function collectXmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectXmlFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) {
      files.push(entryPath);
    }
  }

  return files;
}

async function findXmlFiles(directory, dryRun) {
  try {
    return await collectXmlFiles(directory);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      if (dryRun) {
        console.log(`XML directory not found: ${directory}`);
        return [];
      }
      throw new Error(`XML directory not found: ${directory}`);
    }
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponseBody(text) {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatErrorBody(body) {
  if (!body) {
    return 'No response body';
  }

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body.message === 'string') {
    return body.message;
  }

  return JSON.stringify(body);
}

async function uploadXmlFile(filePath, uploadUrl, cookieHeader, timeoutMs) {
  const buffer = await fs.readFile(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: 'application/xml' }), path.basename(filePath));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
      },
      body: formData,
      signal: controller.signal,
    });

    const responseText = await response.text();
    const responseBody = parseResponseBody(responseText);

    return {
      ok: response.ok,
      status: response.status,
      body: responseBody,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const xmlDirectory = getXmlDirectory();
  const files = await findXmlFiles(xmlDirectory, args.dryRun);

  console.log(`XML directory: ${xmlDirectory}`);
  console.log(`XML files found: ${files.length}`);

  if (files.length === 0) {
    if (!args.dryRun) {
      process.exitCode = 1;
    }
    return;
  }

  if (args.dryRun) {
    files.forEach((filePath) => console.log(path.relative(repoRoot, filePath)));
    return;
  }

  const uploadUrl = buildUploadUrl();
  const cookieHeader = buildCookieHeader();
  const uploadDelayMs = parsePositiveIntegerEnv('UPLOAD_DELAY_MS', defaultUploadDelayMs);
  const uploadTimeoutMs = parsePositiveIntegerEnv('UPLOAD_TIMEOUT_MS', defaultUploadTimeoutMs);
  const results = [];

  console.log(`Upload URL: ${uploadUrl}`);
  console.log(`Upload delay: ${uploadDelayMs}ms`);

  for (const [index, filePath] of files.entries()) {
    const label = `${index + 1}/${files.length}`;
    const relativePath = path.relative(repoRoot, filePath);
    console.log(`[${label}] Uploading ${relativePath}`);

    try {
      const result = await uploadXmlFile(filePath, uploadUrl, cookieHeader, uploadTimeoutMs);
      if (result.ok) {
        const depotId = result.body && typeof result.body === 'object' ? result.body.id : undefined;
        console.log(`[${label}] OK status=${result.status}${depotId ? ` depotId=${depotId}` : ''}`);
        results.push({ filePath, ok: true, status: result.status });
      } else {
        console.error(`[${label}] ERROR status=${result.status} message=${formatErrorBody(result.body)}`);
        results.push({ filePath, ok: false, status: result.status });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${label}] ERROR message=${message}`);
      results.push({ filePath, ok: false });
    }

    if (index < files.length - 1 && uploadDelayMs > 0) {
      await sleep(uploadDelayMs);
    }
  }

  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;
  console.log(`Summary: ${successCount} succeeded, ${failureCount} failed`);

  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
