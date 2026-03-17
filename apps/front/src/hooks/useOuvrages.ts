import { useQuery } from '@tanstack/react-query';
import { fetchOuvrages } from '../api/mesures';

export function useOuvrages() {
  return useQuery({
    queryKey: ['mesures-ouvrages'],
    queryFn: fetchOuvrages,
  });
}
