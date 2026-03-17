import {
  listDepots,
  listAllDepots,
  downloadAdminRapport as downloadAdminRapportRoute,
  downloadAdminXml as downloadAdminXmlRoute,
  checkDroitsDeDepot as checkDroitsRoute,
  downloadRapport as downloadRapportRoute,
  downloadXml as downloadXmlRoute,
  getControles,
  getControlesSandre,
  getMasa,
  type RouteResponse,
} from '@lib/dossier';
import { apiPostFormData, apiDownload, apiCall, buildRoutePath } from './apiClient';

export type DroitsDeDepotResponse = RouteResponse<typeof checkDroitsRoute>;

export async function fetchDepots() {
  return apiCall(listDepots);
}

export async function fetchControles(depotId: string) {
  return apiCall(getControles, { params: { depotId } });
}

export async function fetchControlesSandre(depotId: string) {
  return apiCall(getControlesSandre, { params: { depotId } });
}

export async function fetchMasa(depotId: string) {
  return apiCall(getMasa, { params: { depotId } });
}

export async function uploadDepot(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await apiPostFormData<void>('/depot/upload', formData);
}

export async function checkDroitsDeDepot(
  cdOuvrageDepollutionList: string[],
  cdSystemeCollecteList: string[],
  isFluxQualifie: boolean = false,
): Promise<DroitsDeDepotResponse> {
  return apiCall(checkDroitsRoute, {
    query: {
      cdOuvrageDepollution: cdOuvrageDepollutionList.join(','),
      cdSystemeCollecte: cdSystemeCollecteList.join(','),
      isFluxQualifie: isFluxQualifie ? 'true' : 'false',
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

export async function fetchAllDepots() {
  return apiCall(listAllDepots);
}

export async function downloadAdminRapport(depotId: string): Promise<Blob> {
  const url = buildRoutePath(downloadAdminRapportRoute, { params: { id: depotId } });
  return apiDownload(url);
}

export async function downloadAdminXml(depotId: string): Promise<Blob> {
  const url = buildRoutePath(downloadAdminXmlRoute, { params: { id: depotId } });
  return apiDownload(url);
}
