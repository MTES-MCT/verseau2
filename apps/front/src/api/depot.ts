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
  initializeDepotUpload,
  completeDepotUpload,
} from '@lib/dossier';
import { apiDownload, apiCall, buildRoutePath } from './apiClient';

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

export type DepotUploadSession = RouteResponse<typeof initializeDepotUpload>;

export async function initializeUpload(file: File): Promise<DepotUploadSession> {
  return apiCall(initializeDepotUpload, {
    body: { fileName: file.name, size: file.size, contentType: file.type },
  });
}

export async function uploadDepotFile(file: File, session: DepotUploadSession): Promise<void> {
  const response = await fetch(session.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: session.headers,
    credentials: 'omit',
  });
  if (!response.ok) {
    throw new Error(`L’envoi du fichier a échoué (${response.status}). Veuillez réessayer.`);
  }
}

export async function completeUpload(depotId: string) {
  return apiCall(completeDepotUpload, { params: { id: depotId } });
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
