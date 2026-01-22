import { useQuery } from '@tanstack/react-query';
import { fetchIndicateursSteu, type IndicateurSteuDto } from '../api/indicateurs';

export function useIndicateursSteu() {
  return useQuery<IndicateurSteuDto[]>({
    queryKey: ['indicateurs-steu'],
    queryFn: fetchIndicateursSteu,
  });
}
