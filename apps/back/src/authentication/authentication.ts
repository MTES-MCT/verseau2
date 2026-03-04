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
  getOIDCConfiguration(): Promise<OIDCConfiguration>;
  handleCallback(code: string, nonce: string): Promise<OIDCTokens & { user: AuthenticatedUser }>;
  getUserInfo(accessToken: string): Promise<AuthenticatedUser>;
  refreshTokens(refreshToken: string): Promise<OIDCTokens>;
  generateLogoutUrl(idToken: string): Promise<string>;
  buildCookieResponse(res: Response, tokens: OIDCTokens): void;
  clearCookieResponse(res: Response): void;
}

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
  intervenant: IntervenantForAuthentication | null;
  isExpertNational: boolean;
}

export const Authentication = Symbol('Authentication');
