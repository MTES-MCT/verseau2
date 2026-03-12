import { useQuery } from '@tanstack/react-query';
import { fetchPointsMesure } from '../api/mesures';

export function usePointsMesure(steuSandreCda: string | null) {
  return useQuery({
    queryKey: ['mesures-points-mesure', steuSandreCda],
    queryFn: () => fetchPointsMesure(steuSandreCda!),
    enabled: !!steuSandreCda,
  });
}
