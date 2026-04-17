import { getIndicateursSteu, type RouteQuery } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchIndicateursSteu(query: RouteQuery<typeof getIndicateursSteu>) {
  return apiCall(getIndicateursSteu, { query });
}
