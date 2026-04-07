import { apiCall } from './apiClient';
import { listBilanSteu, listBilanScl, type RouteQuery } from '@lib/dossier';

export const fetchBilanSteu = async (query: RouteQuery<typeof listBilanSteu>) => {
  return apiCall(listBilanSteu, { query });
};

export const fetchBilanScl = async (query: RouteQuery<typeof listBilanScl>) => {
  return apiCall(listBilanScl, { query });
};
