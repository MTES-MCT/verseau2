import { useState } from 'react';
import { CURRENT_EVENEMENT_YEAR } from '@lib/dossier';

export interface FilterState {
  mode: 'steu' | 'scl';
  year: number;
  typeEvenementCode: string;
  pointMesureIdentifiant: string;
  ouvrageDepollutionCode: string;
  systemeCollecteCode: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const useEvenementFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    mode: 'steu',
    year: CURRENT_EVENEMENT_YEAR,
    typeEvenementCode: '',
    pointMesureIdentifiant: '',
    ouvrageDepollutionCode: '',
    systemeCollecteCode: '',
  });

  const [page, setPage] = useState(1);

  const updateFilter = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      if (newFilters.mode === 'steu') {
        updated.pointMesureIdentifiant = '';
        updated.systemeCollecteCode = '';
      } else if (newFilters.mode === 'scl') {
        updated.ouvrageDepollutionCode = '';
      }
      return updated;
    });
    setPage(1);
  };

  return { filters, updateFilter, page, setPage };
};
