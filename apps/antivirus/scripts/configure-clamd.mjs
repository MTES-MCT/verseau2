import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CLAMD_MAX_SCAN_TIME_MS } from '../src/contract.ts';

// scalingo-postbuild runs in the selected PROJECT_DIR build directory, after
// the preceding ClamAV buildpack generated these files, before profile.d starts
// daemons at runtime. Do not use CLAMD_CONFIG_FILE (it points to runtime /app).
export const policy = {
  StreamMaxLength: '73400320',
  MaxFileSize: '73400320',
  MaxScanSize: '73400320',
  MaxRecursion: '10',
  MaxFiles: '1000',
  MaxScanTime: String(CLAMD_MAX_SCAN_TIME_MS),
  AlertExceedsMax: 'yes',
  AlertEncrypted: 'yes',
  MaxThreads: '1',
  MaxQueue: '1',
  ReadTimeout: '120',
  CommandReadTimeout: '5',
  SendBufTimeout: '5000',
  // Never let a previous clean cache entry bypass current scan limits.
  DisableCache: 'yes',
  LeaveTemporaryFiles: 'no',
  LogFile: '/dev/null',
  LogFileUnlock: 'yes',
  LogSyslog: 'no',
  LogVerbose: 'no',
  LogClean: 'no',
  Debug: 'no',
};

export function applyPolicy(original) {
  const keys = new Set(Object.keys(policy));
  const lines = original.split('\n').filter(line => !keys.has(line.trim().split(/\s+/)[0]));
  return `${lines.join('\n').trimEnd()}\n${Object.entries(policy).map(([key, value]) => `${key} ${value}`).join('\n')}\n`;
}

export async function configure(root = process.cwd()) {
  const conf = resolve(root, 'clamav/conf/clamd.conf');
  const original = await readFile(conf, 'utf8'); // Missing buildpack is fatal, not silently skipped.
  if (!/^LocalSocket\s+\/app\/clamav\/run\/clamd.sock\s*$/m.test(original) ||
      !/^DatabaseDirectory\s+\/app\/clamav\/data\s*$/m.test(original) ||
      /^\s*TCPSocket\b/m.test(original)) {
    throw new Error('Unexpected generated ClamAV configuration: review upstream buildpack changes');
  }
  await writeFile(conf, applyPolicy(original));
  // VERSION's date uses the daemon timezone. This runs BEFORE 020-clamd.sh.
  await writeFile(resolve(root, '.profile.d/005-antivirus-timezone.sh'), 'export TZ=UTC\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await configure();
}
