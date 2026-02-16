import type { ControleDto, ControleSandreDto, MasaDto } from '@lib/dossier';
import {
  listDepots,
  checkDroitsDeDepot as checkDroitsRoute,
  downloadRapport as downloadRapportRoute,
  downloadXml as downloadXmlRoute,
} from '@lib/dossier';
import { apiGet, apiPostFormData, apiDownload, apiCall, buildRoutePath } from './apiClient';

export type DroitsDeDepotResponse = {
  authorized: boolean;
};

export async function fetchDepots() {
  return apiCall(listDepots);
}

export async function fetchControles(depotId: string): Promise<ControleDto[]> {
  return apiGet<ControleDto[]>(`/depot/${depotId}/controle`);
}

export async function fetchControlesSandre(depotId: string): Promise<ControleSandreDto[]> {
  return apiGet<ControleSandreDto[]>(`/depot/${depotId}/controle/sandre`);
}

export async function fetchMasa(depotId: string): Promise<MasaDto | null> {
  return apiGet<MasaDto | null>(`/depot/${depotId}/masa`);
}

export async function uploadDepot(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await apiPostFormData<void>('/depot/upload', formData);
}

export async function checkDroitsDeDepot(
  cdOuvrageDepollutionList: string[],
  cdSystemeCollecteList: string[],
): Promise<DroitsDeDepotResponse> {
  return apiCall(checkDroitsRoute, {
    query: {
      cdOuvrageDepollution: cdOuvrageDepollutionList.join(','),
      cdSystemeCollecte: cdSystemeCollecteList.join(','),
    },
  });
}

export async function downloadRapport(depotId: string): Promise<Blob> {
  const url = buildRoutePath(downloadRapportRoute, { params: { id: depotId } });
  return apiDownload(url);
}

export async function downloadXml(depotId: string): Promise<Blob> {
  const url = buildRoutePath(downloadXmlRoute, { params: { id: depotId } });
  return apiDownload(url);
}
