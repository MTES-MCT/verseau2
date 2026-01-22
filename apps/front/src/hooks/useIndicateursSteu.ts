import { useQuery } from '@tanstack/react-query';
import { fetchIndicateursSteu } from '../api/indicateurs';
import { type IndicateurSteuDto } from '@lib/dossier';

export function useIndicateursSteu() {
  return useQuery<IndicateurSteuDto[]>({
    queryKey: ['indicateurs-steu'],
    queryFn: fetchIndicateursSteu,
  });
}
