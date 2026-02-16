import { codesToParametres } from '@lib/dossier';
import { apiCall } from './apiClient';

export async function fetchParametresFromCodes(codes: string[]): Promise<(string | null)[]> {
  const data = await apiCall(codesToParametres, { query: { codes } });
  return data.parametres;
}
