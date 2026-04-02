/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiCall } from './apiClient';
import { listEvenementSteu, listEvenementScl, listEvenementTypes, listEvenementPmo } from '@lib/dossier';

export const fetchEvenementSteu = async (query: any) => {
  return apiCall(listEvenementSteu, { query });
};

export const fetchEvenementScl = async (query: any) => {
  return apiCall(listEvenementScl, { query });
};

export const fetchEvenementTypes = async () => {
  return apiCall(listEvenementTypes);
};

export const fetchEvenementPmo = async () => {
  return apiCall(listEvenementPmo);
};
