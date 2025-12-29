import { buildUrl, apiGet } from './apiClient';

export async function fetchParametresFromCodes(codes: string[]): Promise<string[]> {
  const url = buildUrl('/referentiel/codes-to-parametres', { codes });
  const data = await apiGet<{ parametres: string[] }>(url);
  return data.parametres;
}
