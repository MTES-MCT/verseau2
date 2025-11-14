export interface FichierDeDepot {
  id: string;
  filePath: string;
}

export interface DepotDeFichier {
  nomOriginalFichier: string;
  size: number;
  type: string;
  buffer: string;
}
