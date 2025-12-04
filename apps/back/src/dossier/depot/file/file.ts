export interface FichierDeDepot {
  depotId: string;
  filePath: string;
  utilisateur: UtilisateurDunEnvoi;
}

export interface UtilisateurDunEnvoi {
  nom: string;
  prenom: string;
}

export interface DepotDeFichier {
  nomOriginalFichier: string;
  size: number;
  type: string;
  buffer: Buffer;
  utilisateur: UtilisateurDunEnvoi;
}
