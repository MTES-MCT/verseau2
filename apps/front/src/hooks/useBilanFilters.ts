import { useSearchParams } from 'react-router';
import {
  CURRENT_BILAN_YEAR,
  listBilanSteu,
  listBilanScl,
  type BilanSteuSortByValue,
  type BilanSclSortByValue,
} from '@lib/dossier';

export type SortByValue = BilanSteuSortByValue | BilanSclSortByValue;

export interface FilterState {
  mode: 'steu' | 'scl';
  year: number;
  ouvrageDepollutionCode: string;
  systemeCollecteCode: string;
  pointMesureId: string;
  parametreCode: string;
  statut: 'TP' | 'TS' | '';
  sortBy?: SortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

function readFilters(searchParams: URLSearchParams): FilterState {
  const mode = searchParams.get('mode') === 'scl' ? 'scl' : 'steu';
  const schema = mode === 'scl' ? listBilanScl.query.shape : listBilanSteu.query.shape;
  const pointMesureId = Number(searchParams.get('pointMesureId'));

  return {
    mode,
    year: schema.year.safeParse(searchParams.get('year')).data ?? CURRENT_BILAN_YEAR,
    ouvrageDepollutionCode: mode === 'steu' ? searchParams.get('ouvrageDepollutionCode') || '' : '',
    systemeCollecteCode: mode === 'scl' ? searchParams.get('systemeCollecteCode') || '' : '',
    pointMesureId:
      mode === 'scl' && Number.isSafeInteger(pointMesureId) && pointMesureId > 0 ? String(pointMesureId) : '',
    parametreCode: mode === 'steu' ? searchParams.get('parametreCode') || '' : '',
    statut: mode === 'scl' ? (listBilanScl.query.shape.statut.safeParse(searchParams.get('statut')).data ?? '') : '',
    sortBy: schema.sortBy.safeParse(searchParams.get('sortBy')).data,
    sortOrder: schema.sortOrder.safeParse(searchParams.get('sortOrder')).data,
  };
}

function writeFilters(searchParams: URLSearchParams, filters: FilterState, page: number): URLSearchParams {
  const nextParams = new URLSearchParams(searchParams);
  const values = {
    ...filters,
    mode: filters.mode === 'steu' ? undefined : filters.mode,
    page: page === 1 ? undefined : page,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value === undefined) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, String(value));
    }
  }

  return nextParams;
}

export const useBilanFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const page = listBilanSteu.query.shape.page.safeParse(searchParams.get('page')).data ?? 1;

  const setPage = (nextPage: number) => {
    setSearchParams(writeFilters(searchParams, filters, nextPage));
  };

  const updateFilter = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    if (newFilters.mode && newFilters.mode !== filters.mode) {
      updated.sortBy = undefined;
      updated.sortOrder = undefined;
    }
    if (newFilters.mode === 'steu') {
      updated.pointMesureId = '';
      updated.systemeCollecteCode = '';
      updated.parametreCode = '';
      updated.statut = '';
    } else if (newFilters.mode === 'scl') {
      updated.ouvrageDepollutionCode = '';
      updated.parametreCode = '';
    }

    if (
      (newFilters.ouvrageDepollutionCode !== undefined &&
        newFilters.ouvrageDepollutionCode !== filters.ouvrageDepollutionCode) ||
      (newFilters.year !== undefined && newFilters.year !== filters.year)
    ) {
      updated.parametreCode = '';
    }

    setSearchParams(writeFilters(searchParams, updated, 1));
  };

  return { filters, updateFilter, page, setPage };
};
