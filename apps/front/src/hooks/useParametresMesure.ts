import { useQuery } from '@tanstack/react-query';
import { fetchParametresMesure } from '../api/mesures';

export function useParametresMesure(steuSandreCda: string | null, pmoCdn: number | null) {
  return useQuery({
    queryKey: ['mesures-parametres', steuSandreCda, pmoCdn],
    queryFn: () => fetchParametresMesure(steuSandreCda!, pmoCdn!),
    enabled: !!steuSandreCda && pmoCdn !== null,
  });
}
