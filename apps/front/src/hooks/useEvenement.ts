import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchEvenementSteu, fetchEvenementScl, fetchEvenementTypes, fetchEvenementPmo } from '../api/evenement';
import { type RouteQuery, listEvenementSteu, listEvenementScl } from '@lib/dossier';

export const useEvenementSteu = (query: RouteQuery<typeof listEvenementSteu>, enabled: boolean) =>
  useQuery({
    queryKey: ['evenement', 'steu', query],
    queryFn: () => fetchEvenementSteu(query),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useEvenementScl = (query: RouteQuery<typeof listEvenementScl>, enabled: boolean) =>
  useQuery({
    queryKey: ['evenement', 'scl', query],
    queryFn: () => fetchEvenementScl(query),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useEvenementTypes = () =>
  useQuery({
    queryKey: ['evenement', 'types'],
    queryFn: () => fetchEvenementTypes(),
  });

export const useEvenementPmo = (enabled: boolean) =>
  useQuery({
    queryKey: ['evenement', 'pmo'],
    queryFn: () => fetchEvenementPmo(),
    enabled,
  });
