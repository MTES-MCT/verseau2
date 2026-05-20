import { codesToParametres, listParametresReferentiel, listPointsMesureReferentiel } from '@lib/dossier';
import type { RouteQuery } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchParametresFromCodes(codes: string[]): Promise<(string | null)[]> {
  const data = await apiCall(codesToParametres, { query: { codes } });
  return data.parametres;
}

export async function fetchPointsMesureReferentiel(query: RouteQuery<typeof listPointsMesureReferentiel>) {
  return apiCall(listPointsMesureReferentiel, { query });
}

export async function fetchParametresReferentiel(codes: string[]) {
  return apiCall(listParametresReferentiel, { body: { codes } });
}
