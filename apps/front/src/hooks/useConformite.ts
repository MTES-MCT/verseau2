import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RouteQuery } from '@lib/dossier';
import { listConformiteScl, listConformiteSteu } from '@lib/dossier';
import { fetchConformiteScl, fetchConformiteSteu, fetchDetailBilanScl, fetchDetailBilanSteu } from '../api/conformite';

export function useConformiteSteu(query: RouteQuery<typeof listConformiteSteu>, enabled = true) {
  return useQuery({
    queryKey: ['conformiteSteu', query],
    queryFn: () => fetchConformiteSteu(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useConformiteScl(query: RouteQuery<typeof listConformiteScl>, enabled = true) {
  return useQuery({
    queryKey: ['conformiteScl', query],
    queryFn: () => fetchConformiteScl(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDetailBilanSteu(steuCdn: number, year: number, enabled = true) {
  return useQuery({
    queryKey: ['conformiteSteuDetail', steuCdn, year],
    queryFn: () => fetchDetailBilanSteu(steuCdn, year),
    enabled,
  });
}

export function useDetailBilanScl(sclCdn: number, year: number, enabled = true) {
  return useQuery({
    queryKey: ['conformiteSclDetail', sclCdn, year],
    queryFn: () => fetchDetailBilanScl(sclCdn, year),
    enabled,
  });
}
