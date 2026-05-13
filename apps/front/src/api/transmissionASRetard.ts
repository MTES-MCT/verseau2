import { apiCall, apiDownloadFile, buildRoutePath } from './apiClient';
import {
  exportTransmissionASRetardScl,
  exportTransmissionASRetardSteu,
  listTransmissionASRetardSteu,
  listTransmissionASRetardScl,
  type RouteQuery,
} from '@lib/dossier';

export const fetchTransmissionASRetardSteu = async (query: RouteQuery<typeof listTransmissionASRetardSteu>) => {
  return apiCall(listTransmissionASRetardSteu, { query });
};

export const fetchTransmissionASRetardScl = async (query: RouteQuery<typeof listTransmissionASRetardScl>) => {
  return apiCall(listTransmissionASRetardScl, { query });
};

export const downloadTransmissionASRetardSteuExport = async (
  query: RouteQuery<typeof exportTransmissionASRetardSteu>,
) => {
  return apiDownloadFile(buildRoutePath(exportTransmissionASRetardSteu, { query }), 'text/csv');
};

export const downloadTransmissionASRetardSclExport = async (
  query: RouteQuery<typeof exportTransmissionASRetardScl>,
) => {
  return apiDownloadFile(buildRoutePath(exportTransmissionASRetardScl, { query }), 'text/csv');
};
