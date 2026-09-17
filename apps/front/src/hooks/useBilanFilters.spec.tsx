import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { CURRENT_BILAN_YEAR } from '@lib/dossier';
import { transitionBilanUrl, useBilanFilters } from './useBilanFilters';
import { DEFAULT_BILAN_FILTER_STATE } from '../helper/bilanUrlFilters';

function renderFilters(query: string) {
  return renderHook(() => ({ ...useBilanFilters(), location: useLocation() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[`/bilan?${query}`]}>{children}</MemoryRouter>
    ),
  });
}

describe('useBilanFilters URL corrections', () => {
  it('corrects an invalid mode when selecting the default mode', () => {
    const { result } = renderFilters('mode=xyz');
    act(() => result.current.updateFilter({ mode: 'steu' }));
    expect(new URLSearchParams(result.current.location.search).has('mode')).toBe(false);
  });

  it('removes an invalid status when clearing the status', () => {
    const { result } = renderFilters('mode=scl&statut=XX');
    act(() => result.current.updateFilter({ statut: '' }));
    expect(new URLSearchParams(result.current.location.search).has('statut')).toBe(false);
  });

  it('collapses duplicate statuses when selecting the already parsed status', () => {
    const { result } = renderFilters('mode=scl&statut=TP&statut=TS');
    act(() => result.current.updateFilter({ statut: 'TP' }));
    expect(new URLSearchParams(result.current.location.search).getAll('statut')).toEqual(['TP']);
  });

  it('preserves an unavailable year when another filter changes', () => {
    const { result } = renderFilters('year=1999');
    act(() => result.current.updateFilter({ parametreCode: '1313' }));
    expect(new URLSearchParams(result.current.location.search).get('year')).toBe('1999');
    expect(result.current.filters.year).toBe(1999);
    expect(result.current.yearError).toContain('1999');
    act(() => result.current.updateFilter({ year: CURRENT_BILAN_YEAR }));
    expect(result.current.yearError).toBeUndefined();
  });
});

describe('transitionBilanUrl', () => {
  it('clears incompatible fields and sorting when switching modes', () => {
    const next = transitionBilanUrl(
      {
        ...DEFAULT_BILAN_FILTER_STATE,
        mode: 'scl',
        systemeCollecteCode: 'SCL001',
        pointMesureId: '42',
        statut: 'TP',
        sortBy: 'date',
        sortOrder: 'DESC',
        page: 3,
      },
      { mode: 'steu' },
    );
    expect(next).toEqual(DEFAULT_BILAN_FILTER_STATE);
    expect(
      transitionBilanUrl(
        { ...DEFAULT_BILAN_FILTER_STATE, ouvrageDepollutionCode: 'STEU001', parametreCode: '1313' },
        { mode: 'scl' },
      ),
    ).toMatchObject({ mode: 'scl', ouvrageDepollutionCode: '', parametreCode: '' });
  });

  it('clears the point and pagination when the SCL changes', () => {
    expect(
      transitionBilanUrl(
        {
          ...DEFAULT_BILAN_FILTER_STATE,
          mode: 'scl',
          systemeCollecteCode: 'SCL001',
          pointMesureId: '42',
          page: 2,
        },
        { systemeCollecteCode: 'SCL002' },
      ),
    ).toMatchObject({ systemeCollecteCode: 'SCL002', pointMesureId: '', page: 1 });
  });

  it('clears the parameter when STEU or year changes, but preserves it when reselecting the same STEU', () => {
    const prev = { ...DEFAULT_BILAN_FILTER_STATE, ouvrageDepollutionCode: 'STEU001', parametreCode: '1313', page: 2 };
    expect(transitionBilanUrl(prev, { ouvrageDepollutionCode: 'STEU002' }).parametreCode).toBe('');
    expect(transitionBilanUrl(prev, { year: CURRENT_BILAN_YEAR - 1 }).parametreCode).toBe('');
    expect(transitionBilanUrl(prev, { ouvrageDepollutionCode: 'STEU001' }).parametreCode).toBe('1313');
  });

  it('resets pagination for filters and sorting, but keeps explicit page changes', () => {
    const prev = { ...DEFAULT_BILAN_FILTER_STATE, page: 4 };
    expect(transitionBilanUrl(prev, { parametreCode: '1313' }).page).toBe(1);
    expect(transitionBilanUrl(prev, { sortBy: 'date', sortOrder: 'DESC' }).page).toBe(1);
    expect(transitionBilanUrl(prev, { page: 3 }).page).toBe(3);
  });
});
