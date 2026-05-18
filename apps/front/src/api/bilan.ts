import { apiCall, apiDownloadFile, buildRoutePath } from './apiClient';
import {
  exportBilanScl,
  exportBilanSteu,
  getSclDetail,
  getSteuDetail,
  listBilanScl,
  listBilanSteu,
  type RouteQuery,
} from '@lib/dossier';

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

export const downloadBilanSteuExport = async (query: RouteQuery<typeof exportBilanSteu>) => {
  return apiDownloadFile(buildRoutePath(exportBilanSteu, { query }), 'text/csv');
};

export const downloadBilanSclExport = async (query: RouteQuery<typeof exportBilanScl>) => {
  return apiDownloadFile(buildRoutePath(exportBilanScl, { query }), 'text/csv');
};
