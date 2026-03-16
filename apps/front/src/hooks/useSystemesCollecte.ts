import { useQuery } from '@tanstack/react-query';
import { fetchSystemesCollecte } from '../api/mesures';

export function useSystemesCollecte() {
  return useQuery({
    queryKey: ['mesures-systemes-collecte'],
    queryFn: fetchSystemesCollecte,
  });
}
