import type { DepotDto, ControleDto, ControleSandreDto } from '@lib/dossier';
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

export async function fetchDepots(): Promise<DepotDto[]> {
  const response = await fetch(`${API_BASE_URL}/admin/depot`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch depots: ${response.statusText}`, response.status, response.statusText);
  }

  return response.json();
}

export async function fetchControles(depotId: string): Promise<ControleDto[]> {
  const response = await fetch(`${API_BASE_URL}/depot/${depotId}/controle`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch controles: ${response.statusText}`, response.status, response.statusText);
  }

  return response.json();
}

export async function fetchControlesSandre(depotId: string): Promise<ControleSandreDto[]> {
  const response = await fetch(`${API_BASE_URL}/depot/${depotId}/controle/sandre`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch SANDRE controles: ${response.statusText}`,
      response.status,
      response.statusText,
    );
  }

  return response.json();
}

export async function uploadDepot(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/depot/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(`Échec de l'envoi: ${message}`, response.status, response.statusText);
  }
}
