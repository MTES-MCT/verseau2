import type { DepotDto, ControleDto, ControleSandreDto } from '@lib/dossier';
import { apiGet, apiPostFormData, buildUrl, apiDownload } from './apiClient';

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

export type DroitsDeDepotResponse = {
  authorized: boolean;
};

export async function fetchDepots(): Promise<DepotDto[]> {
  return apiGet<DepotDto[]>('/depot');
}

export async function fetchControles(depotId: string): Promise<ControleDto[]> {
  return apiGet<ControleDto[]>(`/depot/${depotId}/controle`);
}

export async function fetchControlesSandre(depotId: string): Promise<ControleSandreDto[]> {
  return apiGet<ControleSandreDto[]>(`/depot/${depotId}/controle/sandre`);
}

export async function uploadDepot(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await apiPostFormData<void>('/depot/upload', formData);
}

export async function checkDroitsDeDepot(cdOuvrage: string): Promise<DroitsDeDepotResponse> {
  const url = buildUrl('/depot/droits-de-depot', { cdOuvrage });
  return apiGet<DroitsDeDepotResponse>(url);
}

export async function downloadRapport(depotId: string): Promise<Blob> {
  const url = `/admin/depot/${depotId}/rapport`;
  return apiDownload(url);
}

export async function downloadXml(depotId: string): Promise<Blob> {
  const url = `/depot/${depotId}/xml`;
  return apiDownload(url);
}
