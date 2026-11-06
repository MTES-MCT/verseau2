import { processFileOptions } from './processFileOptions';

describe('process_file bounded queue budget', () => {
  const original = process.env.ANTIVIRUS_TIMEOUT_MS;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.ANTIVIRUS_TIMEOUT_MS;
    } else {
      process.env.ANTIVIRUS_TIMEOUT_MS = original;
    }
  });
  it('reserves download, parse/persist headroom beyond the HTTP timeout, with bounded backoff', () => {
    delete process.env.ANTIVIRUS_TIMEOUT_MS;
    expect(processFileOptions()).toEqual({
      expireInSeconds: 300,
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      retryDelayMax: 120,
    });
  });
  it('does not tie the parser lease to the scanner HTTP timeout', () => {
    process.env.ANTIVIRUS_TIMEOUT_MS = '600000';
    expect(processFileOptions().expireInSeconds).toBe(300);
  });
});
