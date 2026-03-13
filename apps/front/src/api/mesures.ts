import {
  listMesures,
  listOuvrages,
  listSystemesCollecte,
  listPointsMesure,
  listParametresMesure,
  listFinalites,
} from '@lib/dossier';
import type { RouteQuery, OuvrageTypeValue } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchMesures(query: RouteQuery<typeof listMesures>) {
  return apiCall(listMesures, { query });
}

export async function fetchOuvrages() {
  return apiCall(listOuvrages);
}

export async function fetchSystemesCollecte() {
  return apiCall(listSystemesCollecte);
}

export async function fetchPointsMesure(ouvrageType: OuvrageTypeValue, ouvrageCode: string) {
  return apiCall(listPointsMesure, { query: { ouvrageType, ouvrageCode } });
}

export async function fetchParametresMesure(ouvrageType: OuvrageTypeValue, ouvrageCode: string, pmoCdn: number) {
  return apiCall(listParametresMesure, { query: { ouvrageType, ouvrageCode, pmoCdn } });
}

export async function fetchFinalites() {
  return apiCall(listFinalites);
}
