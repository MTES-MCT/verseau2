import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RouteQuery } from '@lib/dossier';
import { listPointsMesureReferentiel } from '@lib/dossier';
import { fetchPointsMesureReferentiel } from '../api/referentiel';

export function usePointsMesureReferentiel(query: RouteQuery<typeof listPointsMesureReferentiel>, enabled = true) {
  return useQuery({
    queryKey: ['referentiel-points-mesure', query],
    queryFn: () => fetchPointsMesureReferentiel(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}
