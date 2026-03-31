import { getConformiteSclDetail, getConformiteSteuDetail, listConformiteScl, listConformiteSteu } from '@lib/dossier';
import type { RouteQuery } from '@lib/dossier';
import { apiCall } from './apiClient';

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
