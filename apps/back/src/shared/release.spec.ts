import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSourceVersion } from './release';

describe('resolveSourceVersion', () => {
  it('uses an injected SOURCE_VERSION when the platform provides one at runtime', () => {
    expect(resolveSourceVersion({ SOURCE_VERSION: 'runtime-commit' }, '/nonexistent/.source-version')).toBe(
      'runtime-commit',
    );
  });

  it('reads the .source-version file written during a Scalingo build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-version-'));
    const file = join(dir, '.source-version');
    writeFileSync(file, '  5f2d9c43a1b7e8d0 \n');
    try {
      expect(resolveSourceVersion({}, file)).toBe('5f2d9c43a1b7e8d0');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns undefined for an empty .source-version file and when nothing is available', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-version-'));
    const file = join(dir, '.source-version');
    writeFileSync(file, '  \n');
    try {
      expect(resolveSourceVersion({}, file)).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(resolveSourceVersion({}, '/nonexistent/.source-version')).toBeUndefined();
  });

  it('ignores Scalingo .release metadata and reads the application commit marker by default', () => {
    const dir = mkdtempSync(join(tmpdir(), 'source-version-'));
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      writeFileSync('.release', 'addons: []\ndefault_process_types:\n  web: npm start');
      expect(resolveSourceVersion({})).toBeUndefined();

      writeFileSync('.source-version', '5f2d9c43a1b7e8d0\n');
      expect(resolveSourceVersion({})).toBe('5f2d9c43a1b7e8d0');
    } finally {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
