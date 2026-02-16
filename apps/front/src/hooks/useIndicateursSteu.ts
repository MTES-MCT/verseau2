import { useQuery } from '@tanstack/react-query';
import { fetchIndicateursSteu } from '../api/indicateurs';

export function useIndicateursSteu() {
  return useQuery({
    queryKey: ['indicateurs-steu'],
    queryFn: fetchIndicateursSteu,
  });
}
