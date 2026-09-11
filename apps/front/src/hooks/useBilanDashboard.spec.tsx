import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { CURRENT_BILAN_YEAR } from '@lib/dossier';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useBilanDashboard } from './useBilanDashboard';
import * as bilanApi from '../api/bilan';

vi.mock('../api/bilan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/bilan')>();
  return {
    ...actual,
    fetchBilanSteu: vi.fn(),
    fetchBilanScl: vi.fn(),
    fetchBilanSteuDetail: vi.fn(),
    fetchBilanSclDetail: vi.fn(),
    downloadBilanSteuExport: vi.fn(),
    downloadBilanSclExport: vi.fn(),
  };
});

vi.mock('../api/referentiel', () => ({ fetchParametresReferentiel: vi.fn().mockResolvedValue([]) }));

describe('useBilanDashboard', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    { total: 45, expectedPage: 3 },
    { total: 0, expectedPage: 1 },
  ])('replaces an out-of-range page with $expectedPage for $total results', async ({ total, expectedPage }) => {
    vi.mocked(bilanApi.fetchBilanSteuDetail).mockResolvedValue({
      ouvrageDepollutionCode: 'STEU001',
      ouvrageDepollutionNom: 'Station Alpha',
      dateMiseEnService: null,
      exploitants: [],
      maitresOuvrage: [],
    });
    vi.mocked(bilanApi.fetchBilanSteu).mockImplementation(async (query) => ({
      data: [],
      total,
      page: query.page,
      pageSize: 20,
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[
            '/previous',
            `/suivi-regulier/bilan?year=${CURRENT_BILAN_YEAR}&ouvrageDepollutionCode=STEU001&page=9`,
          ]}
        >
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({
        dashboard: useBilanDashboard(),
        location: useLocation(),
        navigate: useNavigate(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.dashboard.page).toBe(expectedPage);
      expect(bilanApi.fetchBilanSteu).toHaveBeenLastCalledWith(expect.objectContaining({ page: expectedPage }));
    });
    act(() => {
      result.current.navigate(-1);
    });
    expect(result.current.location.pathname).toBe('/previous');
  });
});
