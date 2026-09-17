import { useCallback } from 'react';
import { CURRENT_BILAN_YEAR, FIRST_BILAN_YEAR } from '@lib/dossier';
import { useUrlFilters, type UrlHistoryMode } from './useUrlFilters';
import {
  bilanUrlFilterConfig,
  type BilanFilterPatch,
  type BilanFilterState,
  type BilanSortByValue,
} from '../helper/bilanUrlFilters';

export type SortByValue = BilanSortByValue;
export type FilterState = BilanFilterState;

/** Apply dependent resets atomically, without replaying change handlers on URL loading. */
export function transitionBilanUrl(prev: BilanFilterState, patch: BilanFilterPatch): BilanFilterState {
  const next = { ...prev, ...patch };

  if (patch.mode !== undefined && patch.mode !== prev.mode) {
    next.sortBy = undefined;
    next.sortOrder = undefined;
    next.parametreCode = '';
  }
  if (next.mode === 'steu') {
    next.systemeCollecteCode = '';
    next.pointMesureId = '';
    next.statut = '';
  } else {
    next.ouvrageDepollutionCode = '';
    next.parametreCode = '';
  }

  if (patch.systemeCollecteCode !== undefined && patch.systemeCollecteCode !== prev.systemeCollecteCode) {
    next.pointMesureId = '';
  }
  if (
    (patch.ouvrageDepollutionCode !== undefined && patch.ouvrageDepollutionCode !== prev.ouvrageDepollutionCode) ||
    (patch.year !== undefined && patch.year !== prev.year)
  ) {
    next.parametreCode = '';
  }
  const keys = Object.keys(patch);
  if (!(keys.length === 1 && keys[0] === 'page')) {
    next.page = 1;
  }
  return next;
}

export const useBilanFilters = () => {
  const { state: filters, update, searchParams } = useUrlFilters(bilanUrlFilterConfig);
  const yearError =
    filters.year < FIRST_BILAN_YEAR || filters.year > CURRENT_BILAN_YEAR
      ? `L’année « ${filters.year} » n’est pas disponible. Choisissez une année entre ${FIRST_BILAN_YEAR} et ${CURRENT_BILAN_YEAR}.`
      : undefined;

  const updateFilter = useCallback(
    (patch: BilanFilterPatch, history: UrlHistoryMode = 'push') => {
      update(transitionBilanUrl(filters, patch), { history });
    },
    [filters, update],
  );

  return { filters, updateFilter, searchParams, yearError };
};
