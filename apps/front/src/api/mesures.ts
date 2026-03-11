import { listMesures, listOuvrages } from '@lib/dossier';
import type { RouteQuery } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchMesures(query: RouteQuery<typeof listMesures>) {
  return apiCall(listMesures, { query });
}

export async function fetchOuvrages() {
  return apiCall(listOuvrages);
}
