export interface OIDCTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface OIDCConfiguration {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

export interface Authentication {
  validateToken(token: string): Promise<AuthenticatedUser>;
  getOIDCConfiguration(): OIDCConfiguration;
  handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUser }>;
  getUserInfo(accessToken: string): Promise<AuthenticatedUser>;
  refreshTokens(refreshToken: string): Promise<OIDCTokens>;
  generateLogoutUrl(idToken: string): string;
}

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
}

export const Authentication = Symbol('Authentication');
