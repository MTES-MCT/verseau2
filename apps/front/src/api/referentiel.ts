import { getCurrentFakeToken } from '../temp/fakeAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

const getToken = () => {
  // TODO: Supprimer le getCurrentFakeToken quand OIDC est disponible
  return getCurrentFakeToken();
};

export async function fetchParametresFromCodes(codes: string[]): Promise<string[]> {
  const url = new URL(`${API_BASE_URL}/referentiel/codes-to-parametres`);
  codes.forEach((code) => url.searchParams.append('codes', code));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`Échec de la récupération des paramètres: ${message}`, response.status, response.statusText);
  }

  const data = await response.json();
  return data.parametres;
}
