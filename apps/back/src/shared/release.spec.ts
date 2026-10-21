import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSourceVersion } from './release';

describe('resolveSourceVersion', () => {
  it('uses an injected SOURCE_VERSION when the platform provides one at runtime', () => {
    expect(resolveSourceVersion({ SOURCE_VERSION: 'runtime-commit' }, '/nonexistent/.release')).toBe('runtime-commit');
  });

  it('reads the .release file written during a Scalingo build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-version-'));
    const file = join(dir, '.release');
    writeFileSync(file, '  5f2d9c43a1b7e8d0 \n');
    try {
      expect(resolveSourceVersion({}, file)).toBe('5f2d9c43a1b7e8d0');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns undefined for an empty .release file and when nothing is available', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-version-'));
    const file = join(dir, '.release');
    writeFileSync(file, '  \n');
    try {
      expect(resolveSourceVersion({}, file)).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(resolveSourceVersion({}, '/nonexistent/.release')).toBeUndefined();
  });
});
