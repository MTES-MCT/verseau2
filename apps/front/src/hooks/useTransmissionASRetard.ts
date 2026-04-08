import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchTransmissionASRetardSteu, fetchTransmissionASRetardScl } from '../api/transmissionASRetard';
import { type RouteQuery, listTransmissionASRetardSteu, listTransmissionASRetardScl } from '@lib/dossier';

export const useTransmissionASRetardSteu = (query: RouteQuery<typeof listTransmissionASRetardSteu>, enabled: boolean) =>
  useQuery({
    queryKey: ['transmissionASRetard', 'steu', query],
    queryFn: () => fetchTransmissionASRetardSteu(query),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useTransmissionASRetardScl = (query: RouteQuery<typeof listTransmissionASRetardScl>, enabled: boolean) =>
  useQuery({
    queryKey: ['transmissionASRetard', 'scl', query],
    queryFn: () => fetchTransmissionASRetardScl(query),
    enabled,
    placeholderData: keepPreviousData,
  });
