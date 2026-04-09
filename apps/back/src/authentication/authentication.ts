export interface OIDCTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
  cerbereAccessToken?: string; // token Cerbere original, stocké dans un cookie séparé pour refresh/logout
}

export interface OIDCConfiguration {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

import { IntervenantForAuthentication } from '@referentiel/lanceleau/lanceleau.model';
import type { Response } from 'express';

export interface Authentication {
  validateToken(token: string): Promise<AuthenticatedUser>;
  /** Verify the internal JWT signature (ignoring expiration) and return the `sub` claim. */
  extractSubjectFromExpiredToken(token: string): Promise<string>;
  getOIDCConfiguration(): Promise<OIDCConfiguration>;
  handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUserAndNomPrenom }>;
  refreshTokens(refreshToken: string, expectedSubject: string): Promise<OIDCTokens>;
  generateLogoutUrl(idToken: string): Promise<string>;
  buildCookieResponse(res: Response, tokens: OIDCTokens): void;
  clearCookieResponse(res: Response): void;
}

export interface AuthenticatedUser {
  cerbereId: string; // Identifiant Cerbere interne (sub)
  mel: string; // email
  itvCdn: number | null; // code intervenant Lanceleau, embarqué dans le token interne
  isExpertNational: boolean; // rôle 305 Lanceleau, embarqué dans le token interne
}

export interface AuthenticatedUserAndNomPrenom extends AuthenticatedUser {
  nom?: string;
  prenom?: string;
}

export interface AuthenticatedUserWithIntervenant {
  user: AuthenticatedUser;
  intervenant: IntervenantForAuthentication | null;
  isExpertNational: boolean;
}

export const Authentication = Symbol('Authentication');
