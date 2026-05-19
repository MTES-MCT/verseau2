import { useState } from 'react';
import {
  CURRENT_TRANSMISSION_YEAR,
  type TransmissionASRetardSteuSortByValue,
  type TransmissionASRetardSclSortByValue,
} from '@lib/dossier';

export type SortByValue = TransmissionASRetardSteuSortByValue | TransmissionASRetardSclSortByValue;

export interface FilterState {
  mode: 'steu' | 'scl';
  year: number;
  ouvrageCode: string;
  sortBy?: SortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

export const useTransmissionASRetardFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    mode: 'steu',
    year: CURRENT_TRANSMISSION_YEAR,
    ouvrageCode: '',
    sortBy: 'nbJoursRetard',
    sortOrder: 'DESC',
  });

  const [page, setPage] = useState(1);

  const updateFilter = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      if (newFilters.mode && newFilters.mode !== prev.mode) {
        updated.ouvrageCode = '';
      }
      return updated;
    });
    setPage(1);
  };

  return { filters, updateFilter, page, setPage };
};
