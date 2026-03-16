import { useQuery } from '@tanstack/react-query';
import { fetchQualifications } from '../api/mesures';

export function useQualifications() {
  return useQuery({
    queryKey: ['mesures-qualifications'],
    queryFn: fetchQualifications,
    staleTime: Infinity, // nomenclature reference data — never goes stale
  });
}
