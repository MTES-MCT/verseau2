// TODO : déplacer vers lib "user" (à créer) ou "dossier"
export interface AuthenticatedUser {
  cerbereId: string; // Identifiant Cerbere interne (sub)
  login: string; // uid / preferred_username
  nom: string; // usual_name
  prenom: string; // given_name
  mel: string; // email
  matricule: string; // cerbere_matricule
  unite?: string; // organizational_unit
  emailMetier?: string; // email_metier
  description?: string; // cerbere_description
  mobile?: string; // cerbere_mobile
  telephone?: string; // phone_number
  profils?: string[]; // cerbere_profils (format: "NOM;PORTEE;RESTRICTION")
  roles?: string[]; // cerbere_roles
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
