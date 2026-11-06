import { antivirusScanOptions } from './antivirusScanOptions';

describe('antivirus_scan bounded queue budget', () => {
  const original = process.env.ANTIVIRUS_TIMEOUT_MS;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.ANTIVIRUS_TIMEOUT_MS;
    } else {
      process.env.ANTIVIRUS_TIMEOUT_MS = original;
    }
  });
  it('reserves download/persistence headroom beyond the HTTP timeout', () => {
    delete process.env.ANTIVIRUS_TIMEOUT_MS;
    expect(antivirusScanOptions()).toEqual({
      expireInSeconds: 300,
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      retryDelayMax: 120,
    });
  });
  it('keeps the lease above an explicitly increased HTTP timeout', () => {
    process.env.ANTIVIRUS_TIMEOUT_MS = '600000';
    expect(antivirusScanOptions().expireInSeconds).toBe(750);
  });
  it.each(['0', 'NaN', '600001'])('rejects invalid timeout %s', (timeout) => {
    process.env.ANTIVIRUS_TIMEOUT_MS = timeout;
    expect(() => antivirusScanOptions()).toThrow('Invalid');
  });
});
