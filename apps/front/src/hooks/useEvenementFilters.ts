import { useState } from 'react';
import {
  CURRENT_EVENEMENT_YEAR,
  type EvenementSteuSortByValue,
  type EvenementSclSortByValue,
  type TypePointMesureValue,
} from '@lib/dossier';

export type SortByValue = EvenementSteuSortByValue | EvenementSclSortByValue;

export interface FilterState {
  mode: 'steu' | 'scl';
  year: number;
  typeEvenementCode: string;
  typePointMesure: TypePointMesureValue;
  pointMesureId: string;
  ouvrageDepollutionCode: string;
  systemeCollecteCode: string;
  sortBy?: SortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

export const useEvenementFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    mode: 'steu',
    year: CURRENT_EVENEMENT_YEAR,
    typeEvenementCode: '',
    typePointMesure: 'tous',
    pointMesureId: '',
    ouvrageDepollutionCode: '',
    systemeCollecteCode: '',
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
        updated.typePointMesure = 'tous';
      } else if (newFilters.mode === 'scl') {
        updated.ouvrageDepollutionCode = '';
        updated.pointMesureId = '';
        updated.typePointMesure = 'tous';
      }
      return updated;
    });
    setPage(1);
  };

  return { filters, updateFilter, page, setPage };
};
