import { VersionController } from './version.controller';

describe('VersionController', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports an injected SOURCE_VERSION', () => {
    process.env = { SOURCE_VERSION: 'deployed-commit' };
    const version = new VersionController().getVersion();
    expect(version.sourceVersion).toBe('deployed-commit');
    expect(version.containerVersion).toBe('unknown');
    expect(version.environment).toBe('unknown');
    expect(version.instance.hostname).toEqual(expect.any(String));
    expect(version.instance.startedAt).toEqual(expect.any(String));
  });

  it('reports unknown when the deployed commit cannot be determined', () => {
    process.env = {};
    expect(new VersionController().getVersion().sourceVersion).toBe('unknown');
  });
});
