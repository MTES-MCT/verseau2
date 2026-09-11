import { useCallback, useMemo } from 'react';
import { useUrlFilters } from './useUrlFilters';
import {
  bilanUrlFilterConfig,
  validateBilanUrl,
  type BilanFilterPatch,
  type BilanFilterState,
  type BilanSortByValue,
  type BilanUrlIssue,
} from '../helper/bilanUrlFilters';

export type SortByValue = BilanSortByValue;
export type FilterState = BilanFilterState;
export type { BilanFilterPatch, BilanUrlIssue };

/**
 * Bilan filters with the URL as source of truth.
 * Parses the current URL synchronously; every user action commits one atomic URL update (push).
 * Automatic corrections (invalid page/sort, opposite-mode fields) are applied via replace with a warning.
 */
export const useBilanFilters = () => {
  const {
    state: filters,
    update,
    searchParams,
    normalizationWarnings,
    dismissNormalizationWarnings,
  } = useUrlFilters(bilanUrlFilterConfig);

  const issues = useMemo(() => validateBilanUrl(searchParams), [searchParams]);

  const updateFilter = (newFilters: BilanFilterPatch) => {
    update(newFilters, { history: 'push' });
  };

  const setPage = (page: number) => {
    update({ page }, { history: 'push' });
  };

  const commitFilters = useCallback(
    (patch: BilanFilterPatch, history: 'push' | 'replace' = 'push') => {
      update(patch, { history });
    },
    [update],
  );

  return {
    filters,
    updateFilter,
    page: filters.page,
    setPage,
    commitFilters,
    searchParams,
    issues,
    normalizationWarnings,
    dismissNormalizationWarnings,
  };
};
