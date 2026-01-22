import { apiGet } from './apiClient';
import type { IndicateurSteuDto } from '@lib/dossier';

export async function fetchIndicateursSteu(): Promise<IndicateurSteuDto[]> {
  return apiGet<IndicateurSteuDto[]>('/indicateurs/steu');
}
