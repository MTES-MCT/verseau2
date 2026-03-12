import { listMesures, listOuvrages, listPointsMesure, listParametresMesure, listFinalites } from '@lib/dossier';
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

export async function fetchParametresMesure(steuSandreCda: string, pmoCdn: number) {
  return apiCall(listParametresMesure, { query: { steuSandreCda, pmoCdn } });
}

export async function fetchFinalites() {
  return apiCall(listFinalites);
}
