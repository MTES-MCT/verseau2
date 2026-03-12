import { useQuery } from '@tanstack/react-query';
import { fetchFinalites } from '../api/mesures';

export function useFinalites() {
  return useQuery({
    queryKey: ['mesures-finalites'],
    queryFn: fetchFinalites,
    staleTime: Infinity, // nomenclature reference data — never goes stale
  });
}
