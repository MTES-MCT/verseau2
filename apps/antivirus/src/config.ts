import { isAbsolute } from 'node:path';

export interface Config {
  host: string;
  port: number;
  token: string;
  socketPath: string;
  scanTimeoutMs: number;
  probeTimeoutMs: number;
  signatureMaxAgeMs: number;
  production: boolean;
}

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number): number {
  const value = env[key] ?? String(fallback);
  const n = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < min || n > max) {
    throw new Error(`Invalid ${key}`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const production = env.NODE_ENV === 'production';
  const token = env.ANTIVIRUS_TOKEN ?? '';
  if (!/^[\x21-\x7e]{32,512}$/.test(token)) {
    throw new Error('Invalid ANTIVIRUS_TOKEN');
  }
  let host = env.ANTIVIRUS_HOST ?? '127.0.0.1';
  if (production) {
    if (env.ANTIVIRUS_PRIVATE_ONLY !== 'true' ||
        !/^[a-z0-9.-]+\.private-network\.internal\.?$/.test(env.SCALINGO_PRIVATE_HOSTNAME ?? '') ||
        env.ANTIVIRUS_HOST !== undefined) {
      throw new Error('Production requires private-network hostname and ANTIVIRUS_PRIVATE_ONLY=true; no host override');
    }
    if (env.CLAMD_DISABLE_DAEMON || env.FRESHCLAM_DISABLE_DAEMON ||
        (env.CLAMAV_DISABLE_PROCESS_TYPES ?? '').split(',').map(x => x.trim()).includes('scanner')) {
      throw new Error('ClamAV daemons must be enabled for scanner');
    }
    host = env.SCALINGO_PRIVATE_HOSTNAME!;
  }
  const socketPath = env.CLAMD_SOCKET_PATH ?? '/app/clamav/run/clamd.sock';
  if (!isAbsolute(socketPath) || socketPath.includes('\0')) {
    throw new Error('CLAMD_SOCKET_PATH must be an absolute Unix socket path');
  }
  return {
    host,
    // PORT is the public router port, deliberately not used here.
    port: integer(env, 'ANTIVIRUS_PORT', 3011, 1, 65535),
    token,
    socketPath,
    scanTimeoutMs: integer(env, 'SCAN_TIMEOUT_MS', 120000, 1000, 180000),
    probeTimeoutMs: integer(env, 'CLAMD_PROBE_TIMEOUT_MS', 3000, 100, 10000),
    signatureMaxAgeMs: integer(env, 'SIGNATURE_MAX_AGE_HOURS', 48, 1, 72) * 3600000,
    production,
  };
}
