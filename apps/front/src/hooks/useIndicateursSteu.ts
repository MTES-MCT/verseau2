import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RouteQuery } from '@lib/dossier';
import { getIndicateursSteu } from '@lib/dossier';
import { fetchIndicateursSteu } from '../api/indicateurs';

export function useIndicateursSteu(query: RouteQuery<typeof getIndicateursSteu>) {
  return useQuery({
    queryKey: ['indicateurs-steu', query],
    queryFn: () => fetchIndicateursSteu(query),
    placeholderData: keepPreviousData,
  });
}
