import { ConfigService } from '@nestjs/config';

// Scanner defaults to 120s: allow its structured timeout response to arrive first.
export const ANTIVIRUS_DEFAULT_TIMEOUT_MS = 150_000;

export interface AntivirusHttpConfig {
  url: string;
  token: string;
  timeoutMs: number;
}

export function isAntivirusBypassed(config: ConfigService): boolean {
  const bypass = config.get<unknown>('ANTIVIRUS_BYPASS');
  if (bypass !== undefined && bypass !== 'true' && bypass !== 'false') {
    throw new Error('ANTIVIRUS_BYPASS must be true or false');
  }
  return bypass === 'true';
}

export function resolveAntivirusConfig(config: ConfigService): AntivirusHttpConfig {
  const endpoint = config.get<string>('ANTIVIRUS_URL');
  const token = config.get<string>('ANTIVIRUS_TOKEN');
  if (!endpoint || !token || !/^[\x21-\x7e]{32,}$/.test(token)) {
    throw new Error('ANTIVIRUS_URL and ANTIVIRUS_TOKEN are required for the private antivirus gateway');
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('ANTIVIRUS_URL must be a private HTTP endpoint on port 3011');
  }
  if (
    url.protocol !== 'http:' ||
    (url.port !== '3011' && url.port !== '3031') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('ANTIVIRUS_URL must be a private HTTP origin on port 3011 without credentials, path or query');
  }
  if (config.get<string>('NODE_ENV') === 'production') {
    // Scalingo process-type DNS, not a public app URL, container IP, or numbered container.
    // https://doc.scalingo.com/platform/networking/private/concepts
    const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
    const privateProcessHost = new RegExp(
      `^[a-z][a-z0-9-]*\\.ap-${uuid}\\.pn-${uuid}\\.private-network\\.internal\\.?$`,
    );
    const processType = url.hostname.split('.')[0];
    if (!privateProcessHost.test(url.hostname) || ['web', 'tcp', 'postdeploy'].includes(processType)) {
      throw new Error('Production ANTIVIRUS_URL requires a non-public Scalingo process-type private DNS hostname');
    }
  }
  const rawTimeout = config.get<string | number>('ANTIVIRUS_TIMEOUT_MS') ?? ANTIVIRUS_DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number(rawTimeout);
  if (!/^\d+$/.test(String(rawTimeout)) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new Error('ANTIVIRUS_TIMEOUT_MS must be an integer between 1 and 600000');
  }
  return { url: new URL('/scan', url).href, token, timeoutMs };
}

export function validateAntivirusEnv(env: Record<string, unknown>): void {
  const provider = env.ANTIVIRUS_PROVIDER;
  if (provider !== undefined && provider !== 'http') {
    throw new Error('ANTIVIRUS_PROVIDER must be http; mock adapters are only available through DI overrides');
  }
  if (isAntivirusBypassed(new ConfigService(env))) {
    return;
  }
  if (env.NODE_ENV === 'production' || provider === 'http' || env.ANTIVIRUS_URL || env.ANTIVIRUS_TOKEN) {
    resolveAntivirusConfig(new ConfigService(env));
  }
}
