import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AntivirusStatus } from '@lib/dossier';
import * as api from '../api/depot';
import { triggerFileDownload } from '../helper/fileDownload';
import { useRapportAndXmlDownload } from './useRapportAndXmlDownload';

vi.mock('../api/depot', () => ({
  downloadRapport: vi.fn(),
  downloadXml: vi.fn(),
  downloadAdminRapport: vi.fn(),
  downloadAdminXml: vi.fn(),
}));
vi.mock('../helper/fileDownload', () => ({ triggerFileDownload: vi.fn() }));

describe('XML download fail-closed UI guard', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([false, true])('requires an accepted status even when called directly (admin=%s)', async (admin) => {
    const { result } = renderHook(() => useRapportAndXmlDownload(admin));
    for (const status of [undefined, AntivirusStatus.PENDING, AntivirusStatus.INFECTED, AntivirusStatus.ERROR]) {
      await act(async () => result.current.handleDownloadXml('dep_1', 'original.xml', status));
      expect(result.current.downloadError).toContain('antivirus non validé');
    }
    expect(api.downloadXml).not.toHaveBeenCalled();
    expect(api.downloadAdminXml).not.toHaveBeenCalled();
    expect(triggerFileDownload).not.toHaveBeenCalled();
  });
  it.each([
    [false, AntivirusStatus.CLEAN],
    [true, AntivirusStatus.CLEAN],
    [false, AntivirusStatus.IGNORED],
    [true, AntivirusStatus.IGNORED],
  ])('routes accepted download to the appropriate endpoint (admin=%s, status=%s)', async (admin, status) => {
    const blob = new Blob(['<xml/>']);
    vi.mocked(api.downloadXml).mockResolvedValue(blob);
    vi.mocked(api.downloadAdminXml).mockResolvedValue(blob);
    const { result } = renderHook(() => useRapportAndXmlDownload(admin));
    await act(async () => result.current.handleDownloadXml('dep_1', 'original.xml', status));
    expect(admin ? api.downloadAdminXml : api.downloadXml).toHaveBeenCalledWith('dep_1');
    expect(triggerFileDownload).toHaveBeenCalledWith(blob, 'original.xml');
  });
});
