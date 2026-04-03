import { apiCall } from './apiClient';
import {
  listEvenementSteu,
  listEvenementScl,
  listEvenementTypes,
  listEvenementPmo,
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

export const fetchEvenementPmo = async () => {
  return apiCall(listEvenementPmo);
};
