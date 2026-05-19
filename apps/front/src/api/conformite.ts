import {
  exportConformiteScl,
  exportConformiteSteu,
  getConformiteSclDetail,
  getConformiteSteuDetail,
  listConformiteScl,
  listConformiteSteu,
} from '@lib/dossier';
import type { RouteQuery } from '@lib/dossier';
import { apiCall, apiDownloadFile, buildRoutePath } from './apiClient';

export async function fetchConformiteSteu(query: RouteQuery<typeof listConformiteSteu>) {
  return apiCall(listConformiteSteu, { query });
}

export async function fetchConformiteScl(query: RouteQuery<typeof listConformiteScl>) {
  return apiCall(listConformiteScl, { query });
}

export async function fetchDetailBilanSteu(steuCdn: number, year: number) {
  return apiCall(getConformiteSteuDetail, { params: { steuCdn }, query: { year } });
}

export async function fetchDetailBilanScl(sclCdn: number, year: number) {
  return apiCall(getConformiteSclDetail, { params: { sclCdn }, query: { year } });
}

export async function downloadConformiteSteuExport(query: RouteQuery<typeof exportConformiteSteu>) {
  return apiDownloadFile(buildRoutePath(exportConformiteSteu, { query }), 'text/csv');
}

export async function downloadConformiteSclExport(query: RouteQuery<typeof exportConformiteScl>) {
  return apiDownloadFile(buildRoutePath(exportConformiteScl, { query }), 'text/csv');
}
