export interface Authentication {
  validateToken(token: string): Promise<AuthenticatedUser>;
}

export interface AuthenticatedUser {
  cerbereId: string; // Identifiant Cerbere interne
  login: string;
  nom: string;
  prenom: string;
  mel: string;
  matricule: string;
}

export const Authentication = Symbol('Authentication');
