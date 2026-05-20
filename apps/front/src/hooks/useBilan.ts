import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchBilanSteu, fetchBilanScl, fetchBilanSteuDetail, fetchBilanSclDetail } from '../api/bilan';
import { fetchParametresReferentiel } from '../api/referentiel';
import { ALLOWED_BILAN_STEU_PARAMETRE_CODES, type RouteQuery, listBilanSteu, listBilanScl } from '@lib/dossier';

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

export const useBilanSteuDetail = (ouvrageDepollutionCode: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['bilan', 'steu', 'detail', ouvrageDepollutionCode],
    queryFn: () => fetchBilanSteuDetail(ouvrageDepollutionCode!),
    enabled: enabled && !!ouvrageDepollutionCode,
  });

export const useBilanSclDetail = (systemeCollecteCode: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['bilan', 'scl', 'detail', systemeCollecteCode],
    queryFn: () => fetchBilanSclDetail(systemeCollecteCode!),
    enabled: enabled && !!systemeCollecteCode,
  });

export const useBilanSteuParametres = () =>
  useQuery({
    queryKey: ['bilan', 'steu', 'parametres'],
    queryFn: () => fetchParametresReferentiel(ALLOWED_BILAN_STEU_PARAMETRE_CODES.map(String)),
  });
