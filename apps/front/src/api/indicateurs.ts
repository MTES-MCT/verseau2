import { getIndicateursSteu } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchIndicateursSteu() {
  return apiCall(getIndicateursSteu);
}
