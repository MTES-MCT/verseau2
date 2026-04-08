import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchBilanSteu, fetchBilanScl } from '../api/bilan';
import { type RouteQuery, listBilanSteu, listBilanScl } from '@lib/dossier';

export const useBilanSteu = (query: RouteQuery<typeof listBilanSteu>, enabled: boolean) =>
  useQuery({
    queryKey: ['bilan', 'steu', query],
    queryFn: () => fetchBilanSteu(query),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useBilanScl = (query: RouteQuery<typeof listBilanScl>, enabled: boolean) =>
  useQuery({
    queryKey: ['bilan', 'scl', query],
    queryFn: () => fetchBilanScl(query),
    enabled,
    placeholderData: keepPreviousData,
  });
