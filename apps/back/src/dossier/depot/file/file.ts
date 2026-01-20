export interface FichierDeDepot {
  depotId: string;
  filePath: string;
  utilisateur: UtilisateurDunEnvoi;
}

export interface UtilisateurDunEnvoi {
  id: string;
  nom: string;
  prenom: string;
}

export interface DepotDeFichier {
  nomOriginalFichier: string;
  size: number;
  type: string;
  buffer: Buffer;
  itvCdn: number;
  utilisateur: UtilisateurDunEnvoi;
}
