import { useQuery } from '@tanstack/react-query';
import { fetchStatuts } from '../api/mesures';

export function useStatuts() {
  return useQuery({
    queryKey: ['mesures-statuts'],
    queryFn: fetchStatuts,
    staleTime: Infinity, // nomenclature reference data — never goes stale
  });
}
