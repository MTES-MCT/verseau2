import { listMesures, listOuvrages, listPointsMesure, listParametresMesure } from '@lib/dossier';
import type { RouteQuery } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchMesures(query: RouteQuery<typeof listMesures>) {
  return apiCall(listMesures, { query });
}

export async function fetchOuvrages() {
  return apiCall(listOuvrages);
}

export async function fetchPointsMesure(steuSandreCda: string) {
  return apiCall(listPointsMesure, { query: { steuSandreCda } });
}

export async function fetchParametresMesure(steuSandreCda: string, pmoNo: string) {
  return apiCall(listParametresMesure, { query: { steuSandreCda, pmoNo } });
}
