import {
  listMesures,
  listOuvrages,
  listSystemesCollecte,
  listPointsMesure,
  listParametresMesure,
  listFinalites,
  listStatuts,
  listQualifications,
} from '@lib/dossier';
import type { RouteQuery, OuvrageTypeValue, TypePointMesureValue } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchMesures(query: RouteQuery<typeof listMesures>) {
  return apiCall(listMesures, { query });
}

export async function fetchOuvrages() {
  return apiCall(listOuvrages, { query: {} });
}

export async function searchOuvrages(search: string) {
  return apiCall(listOuvrages, { query: { search } });
}

export async function fetchSystemesCollecte() {
  return apiCall(listSystemesCollecte, { query: {} });
}

export async function searchSystemesCollecte(search: string) {
  return apiCall(listSystemesCollecte, { query: { search } });
}

export async function fetchPointsMesure(
  ouvrageType: OuvrageTypeValue,
  ouvrageCode: string,
  typePoint: TypePointMesureValue = 'tous',
) {
  return apiCall(listPointsMesure, {
    query: { ouvrageType, ouvrageCode, typePoint },
  });
}

export async function fetchParametresMesure(ouvrageType: OuvrageTypeValue, ouvrageCode: string, pmoCdn: number) {
  return apiCall(listParametresMesure, { query: { ouvrageType, ouvrageCode, pmoCdn } });
}

export async function fetchFinalites() {
  return apiCall(listFinalites);
}

export async function fetchStatuts() {
  return apiCall(listStatuts);
}

export async function fetchQualifications() {
  return apiCall(listQualifications);
}
