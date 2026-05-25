import { useState } from 'react';
import { CURRENT_BILAN_YEAR, type BilanSteuSortByValue, type BilanSclSortByValue } from '@lib/dossier';

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

export const useBilanFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    mode: 'steu',
    year: CURRENT_BILAN_YEAR,
    ouvrageDepollutionCode: '',
    systemeCollecteCode: '',
    pointMesureId: '',
    parametreCode: '',
    statut: '',
  });

  const [page, setPage] = useState(1);

  const updateFilter = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      if (newFilters.mode && newFilters.mode !== prev.mode) {
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
          newFilters.ouvrageDepollutionCode !== prev.ouvrageDepollutionCode) ||
        (newFilters.year !== undefined && newFilters.year !== prev.year)
      ) {
        updated.parametreCode = '';
      }

      return updated;
    });
    setPage(1);
  };

  return { filters, updateFilter, page, setPage };
};
