import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadDepotFile, fetchXmlParseBudgets } from './depot';
import { DEFAULT_XML_PARSE_BUDGETS } from '@lib/parser';

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

describe('fetchXmlParseBudgets', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retrieves validated effective limits from the authenticated API', async () => {
    const budgets = { ...DEFAULT_XML_PARSE_BUDGETS, maxElements: 2_500_000, maxDepth: 2 };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(budgets), { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchXmlParseBudgets()).resolves.toEqual(budgets);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/depot/upload/xml-parse-budgets'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it.each([
    {},
    { ...DEFAULT_XML_PARSE_BUDGETS, maxDepth: null },
    { ...DEFAULT_XML_PARSE_BUDGETS, maxElements: -1 },
    { ...DEFAULT_XML_PARSE_BUDGETS, maxTextLength: '12000000' },
  ])('rejects malformed policy %j instead of letting parser defaults apply', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));

    await expect(fetchXmlParseBudgets()).rejects.toThrow();
  });
});
