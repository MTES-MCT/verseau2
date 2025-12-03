export interface FichierDeDepot {
  depotId: string;
  filePath: string;
}

export interface DepotDeFichier {
  nomOriginalFichier: string;
  size: number;
  type: string;
  buffer: Buffer;
}
