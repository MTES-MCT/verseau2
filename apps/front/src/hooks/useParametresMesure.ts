import { useQuery } from '@tanstack/react-query';
import { fetchParametresMesure } from '../api/mesures';

export function useParametresMesure(steuSandreCda: string | null, pmoNo: string | null) {
  return useQuery({
    queryKey: ['mesures-parametres', steuSandreCda, pmoNo],
    queryFn: () => fetchParametresMesure(steuSandreCda!, pmoNo!),
    enabled: !!steuSandreCda && !!pmoNo,
  });
}
