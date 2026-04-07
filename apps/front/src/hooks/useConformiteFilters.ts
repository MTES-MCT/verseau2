import { useMemo, useState } from 'react';
import type {
  ConformiteSclSortByValue,
  ConformiteSteuSortByValue,
  RouteQuery,
  TrancheObligationRfa,
} from '@lib/dossier';
import { CURRENT_CONFORMITE_YEAR, FIRST_CONFORMITE_YEAR, listConformiteScl, listConformiteSteu } from '@lib/dossier';
import { useConformiteScl, useConformiteSteu } from './useConformite';

const PAGE_SIZE = 20;
const DEFAULT_CONFORMITE_YEAR = Math.max(FIRST_CONFORMITE_YEAR, CURRENT_CONFORMITE_YEAR - 1);

type SortByValue = ConformiteSteuSortByValue | ConformiteSclSortByValue;

export interface FilterState {
  mode: 'steu' | 'scl';
  year: string;
  trancheObligationRfa: TrancheObligationRfa | '';
  impact: 'avec' | 'sans' | '';
  sortBy?: SortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

const INITIAL_FILTERS: FilterState = {
  mode: 'steu',
  year: DEFAULT_CONFORMITE_YEAR.toString(),
  trancheObligationRfa: '',
  impact: '',
  sortBy: undefined,
  sortOrder: undefined,
};

function buildSteuQuery(submitted: FilterState, page: number): RouteQuery<typeof listConformiteSteu> {
  return {
    year: Number(submitted.year),
    ...(submitted.trancheObligationRfa ? { trancheObligationRfa: submitted.trancheObligationRfa } : {}),
    ...(submitted.impact ? { impact: submitted.impact } : {}),
    ...(submitted.sortBy ? { sortBy: submitted.sortBy as ConformiteSteuSortByValue } : {}),
    ...(submitted.sortOrder ? { sortOrder: submitted.sortOrder } : {}),
    page,
    pageSize: PAGE_SIZE,
  };
}

function buildSclQuery(submitted: FilterState, page: number): RouteQuery<typeof listConformiteScl> {
  return {
    year: Number(submitted.year),
    ...(submitted.trancheObligationRfa ? { trancheObligationRfa: submitted.trancheObligationRfa } : {}),
    ...(submitted.impact ? { impact: submitted.impact } : {}),
    ...(submitted.sortBy ? { sortBy: submitted.sortBy as ConformiteSclSortByValue } : {}),
    ...(submitted.sortOrder ? { sortOrder: submitted.sortOrder } : {}),
    page,
    pageSize: PAGE_SIZE,
  };
}

export function useConformiteFilters() {
  const [form, setForm] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const yearOptions = useMemo(
    () =>
      [CURRENT_CONFORMITE_YEAR, CURRENT_CONFORMITE_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_CONFORMITE_YEAR && years.indexOf(year) === index)
        .map((year) => year.toString()),
    [],
  );

  const steuQuery = buildSteuQuery(form, page);
  const sclQuery = buildSclQuery(form, page);

  const steuResult = useConformiteSteu(steuQuery, form.mode === 'steu');
  const sclResult = useConformiteScl(sclQuery, form.mode === 'scl');

  const activeResult = form.mode === 'steu' ? steuResult : sclResult;
  const totalPages = activeResult.data ? Math.ceil(activeResult.data.total / PAGE_SIZE) : 0;

  function updateMode(mode: FilterState['mode']) {
    setForm((current) => ({
      ...current,
      mode,
      sortBy: undefined,
      sortOrder: undefined,
    }));
    setPage(1);
  }

  function updateForm(field: Exclude<keyof FilterState, 'mode' | 'sortBy' | 'sortOrder'>, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function setSort(sortBy: SortByValue, sortOrder: 'ASC' | 'DESC') {
    setForm((current) => ({ ...current, sortBy, sortOrder }));
    setPage(1);
  }

  return {
    form,
    appliedYear: Number(form.year),
    updateForm,
    updateMode,
    setSort,
    yearOptions,
    data: activeResult.data,
    isLoading: activeResult.isLoading,
    isFetching: activeResult.isFetching,
    error: activeResult.error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
  };
}
