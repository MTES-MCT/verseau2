import type { Depot, Controle } from '../types/depot';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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

export async function fetchDepots(): Promise<Depot[]> {
  const response = await fetch(`${API_BASE_URL}/admin/depot`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch depots: ${response.statusText}`, response.status, response.statusText);
  }

  return response.json();
}

export async function fetchControles(depotId: string): Promise<Controle[]> {
  const response = await fetch(`${API_BASE_URL}/depot/${depotId}/controle`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch controles: ${response.statusText}`, response.status, response.statusText);
  }

  return response.json();
}
