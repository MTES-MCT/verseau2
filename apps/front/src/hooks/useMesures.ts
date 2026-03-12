import { useQuery } from '@tanstack/react-query';
import type { RouteQuery } from '@lib/dossier';
import { listMesures } from '@lib/dossier';
import { fetchMesures } from '../api/mesures';

export function useMesures(query: RouteQuery<typeof listMesures>, enabled = true) {
  return useQuery({
    queryKey: ['mesures', query],
    queryFn: () => fetchMesures(query),
    enabled,
  });
}
