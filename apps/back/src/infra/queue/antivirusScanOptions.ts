/** 90s clamd < 120s scanner < 150s HTTP (default) < 300s queue lease. */
export function antivirusScanOptions() {
  const scanTimeoutMs = Number(process.env.ANTIVIRUS_TIMEOUT_MS ?? 150_000);
  if (!Number.isInteger(scanTimeoutMs) || scanTimeoutMs < 1 || scanTimeoutMs > 600_000) {
    throw new Error('Invalid ANTIVIRUS_TIMEOUT_MS');
  }
  return {
    expireInSeconds: Math.ceil(scanTimeoutMs / 1000) + 150,
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 120,
  };
}
