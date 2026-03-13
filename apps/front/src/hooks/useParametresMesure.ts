import { useQuery } from '@tanstack/react-query';
import type { OuvrageTypeValue } from '@lib/dossier';
import { fetchParametresMesure } from '../api/mesures';

export function useParametresMesure(ouvrageType: OuvrageTypeValue, ouvrageCode: string | null, pmoCdn: number | null) {
  return useQuery({
    queryKey: ['mesures-parametres', ouvrageType, ouvrageCode, pmoCdn],
    queryFn: () => fetchParametresMesure(ouvrageType, ouvrageCode!, pmoCdn!),
    enabled: !!ouvrageCode && pmoCdn !== null,
  });
}
