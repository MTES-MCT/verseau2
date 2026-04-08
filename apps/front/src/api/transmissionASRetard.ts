import { apiCall } from './apiClient';
import { listTransmissionASRetardSteu, listTransmissionASRetardScl, type RouteQuery } from '@lib/dossier';

export const fetchTransmissionASRetardSteu = async (query: RouteQuery<typeof listTransmissionASRetardSteu>) => {
  return apiCall(listTransmissionASRetardSteu, { query });
};

export const fetchTransmissionASRetardScl = async (query: RouteQuery<typeof listTransmissionASRetardScl>) => {
  return apiCall(listTransmissionASRetardScl, { query });
};
