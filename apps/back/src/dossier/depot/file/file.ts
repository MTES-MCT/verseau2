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
