import { existsSync, readFileSync } from 'node:fs';

export const SOURCE_VERSION_FILE = '.source-version';

/**
 * Deployed git commit, when it can be determined. Some platforms inject
 * `SOURCE_VERSION` at runtime; on Scalingo it exists at build time only, so the
 * root `build` script captures it into `.source-version` (relative to the
 * runtime working directory). Do not use `.release`: Scalingo generates its
 * own buildpack metadata there. Returns undefined when neither is available.
 */
export function resolveSourceVersion(env: NodeJS.ProcessEnv, releaseFile = SOURCE_VERSION_FILE): string | undefined {
  const injected = env.SOURCE_VERSION?.trim();
  if (injected) {
    return injected;
  }
  if (existsSync(releaseFile)) {
    const fromFile = readFileSync(releaseFile, 'utf8').trim();
    if (fromFile) {
      return fromFile;
    }
  }
  return undefined;
}
