import { isAbsolute } from 'node:path';

// Messages contain only developer-controlled setting names/rules, never values.
export class ConfigurationError extends Error {}

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
    throw new ConfigurationError(`Invalid ${key}`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const production = env.NODE_ENV === 'production';
  const token = env.ANTIVIRUS_TOKEN ?? '';
  if (!/^[\x21-\x7e]{32,512}$/.test(token)) {
    throw new ConfigurationError('Invalid ANTIVIRUS_TOKEN');
  }
  const host = env.ANTIVIRUS_HOST ?? '127.0.0.1';
  if (production) {
    if (env.ANTIVIRUS_PRIVATE_ONLY !== 'true') {
      throw new ConfigurationError('Production requires ANTIVIRUS_PRIVATE_ONLY=true');
    }
    // Require the bind hostname without imposing a DNS naming convention.
    // Startup validates the resolved private interface before listening.
    if (!env.ANTIVIRUS_HOST?.trim()) {
      throw new ConfigurationError('Production requires ANTIVIRUS_HOST');
    }
    if (env.CLAMD_DISABLE_DAEMON || env.FRESHCLAM_DISABLE_DAEMON ||
        (env.CLAMAV_DISABLE_PROCESS_TYPES ?? '').split(',').map(x => x.trim()).includes('scanner')) {
      throw new ConfigurationError('ClamAV daemons must be enabled for scanner');
    }
  }
  const socketPath = env.CLAMD_SOCKET_PATH ?? '/app/clamav/run/clamd.sock';
  if (!isAbsolute(socketPath) || socketPath.includes('\0')) {
    throw new ConfigurationError('CLAMD_SOCKET_PATH must be an absolute Unix socket path');
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
