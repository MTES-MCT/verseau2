import { useQuery } from '@tanstack/react-query';
import type { OuvrageTypeValue } from '@lib/dossier';
import { fetchPointsMesure } from '../api/mesures';

export function usePointsMesure(ouvrageType: OuvrageTypeValue, ouvrageCode: string | null) {
  return useQuery({
    queryKey: ['mesures-points-mesure', ouvrageType, ouvrageCode],
    queryFn: () => fetchPointsMesure(ouvrageType, ouvrageCode!),
    enabled: !!ouvrageCode,
  });
}
