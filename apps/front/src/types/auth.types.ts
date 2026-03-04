// TODO : déplacer vers lib "user" (à créer) ou "dossier"
export interface AuthenticatedUser {
  cerbereId: string; // Identifiant Cerbere interne (sub)
  nom: string; // usual_name
  prenom: string; // given_name
  mel: string; // email
  itvCdn: number | null; // code intervenant Lanceleau, embarqué dans le token interne
  isExpertNational: boolean; // rôle 305 Lanceleau, embarqué dans le token interne
}

export interface AuthenticatedUserWithIntervenant {
  user: AuthenticatedUser;
  intervenant: {
    itvCdn: number;
    nom: string;
  } | null;
  isExpertNational: boolean;
}
