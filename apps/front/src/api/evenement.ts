import { apiCall, apiDownloadFile, buildRoutePath } from './apiClient';
import {
  exportEvenementScl,
  exportEvenementSteu,
  listEvenementSteu,
  listEvenementScl,
  listEvenementTypes,
  type RouteQuery,
} from '@lib/dossier';

export const fetchEvenementSteu = async (query: RouteQuery<typeof listEvenementSteu>) => {
  return apiCall(listEvenementSteu, { query });
};

export const fetchEvenementScl = async (query: RouteQuery<typeof listEvenementScl>) => {
  return apiCall(listEvenementScl, { query });
};

export const fetchEvenementTypes = async () => {
  return apiCall(listEvenementTypes);
};

export const downloadEvenementSteuExport = async (query: RouteQuery<typeof exportEvenementSteu>) => {
  return apiDownloadFile(buildRoutePath(exportEvenementSteu, { query }), 'text/csv');
};

export const downloadEvenementSclExport = async (query: RouteQuery<typeof exportEvenementScl>) => {
  return apiDownloadFile(buildRoutePath(exportEvenementScl, { query }), 'text/csv');
};
