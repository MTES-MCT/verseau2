import { useQuery } from '@tanstack/react-query';
import type { OuvrageTypeValue, TypePointMesureValue } from '@lib/dossier';
import { fetchPointsMesure } from '../api/mesures';

export function usePointsMesure(
  ouvrageType: OuvrageTypeValue,
  ouvrageCode: string | null,
  typePoint: TypePointMesureValue = 'tous',
) {
  return useQuery({
    queryKey: ['mesures-points-mesure', ouvrageType, ouvrageCode, typePoint],
    queryFn: () => fetchPointsMesure(ouvrageType, ouvrageCode!, typePoint),
    enabled: !!ouvrageCode,
  });
}
