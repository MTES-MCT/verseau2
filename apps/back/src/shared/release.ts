import { existsSync, readFileSync } from 'node:fs';

/**
 * Deployed git commit, when it can be determined. Some platforms inject
 * `SOURCE_VERSION` at runtime; on Scalingo it exists at build time only, so the
 * root `build` script captures it into a `.release` file (relative to the
 * runtime working directory). Returns undefined when neither is available.
 */
export function resolveSourceVersion(env: NodeJS.ProcessEnv, releaseFile = '.release'): string | undefined {
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
