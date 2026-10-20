import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadDepotFile } from './depot';

describe('uploadDepotFile', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the raw file to S3 without API cookies or authentication headers', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const file = new File(['<root/>'], 'test.xml', { type: 'application/xml' });
    await uploadDepotFile(file, {
      depotId: 'dep_123',
      uploadUrl: 'https://s3.test/upload',
      headers: { 'Content-Type': 'application/xml' },
      expiresAt: '2026-09-25T12:00:00.000Z',
    });
    expect(fetch).toHaveBeenCalledExactlyOnceWith('https://s3.test/upload', {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'application/xml' },
      credentials: 'omit',
    });
  });
});
