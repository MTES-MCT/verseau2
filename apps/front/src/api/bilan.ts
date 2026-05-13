import { apiCall } from './apiClient';
import { getSclDetail, getSteuDetail, listBilanScl, listBilanSteu, type RouteQuery } from '@lib/dossier';

export const fetchBilanSteu = async (query: RouteQuery<typeof listBilanSteu>) => {
  return apiCall(listBilanSteu, { query });
};

export const fetchBilanScl = async (query: RouteQuery<typeof listBilanScl>) => {
  return apiCall(listBilanScl, { query });
};

export const fetchBilanSteuDetail = async (ouvrageDepollutionCode: string) => {
  return apiCall(getSteuDetail, { params: { ouvrageDepollutionCode } });
};

export const fetchBilanSclDetail = async (systemeCollecteCode: string) => {
  return apiCall(getSclDetail, { params: { systemeCollecteCode } });
};
