export interface User {
  id: string;
  sub: string; // OIDC subject claim
  itvCdn: string; // External ID from referentiel
  createdAt: Date;
  updatedAt: Date;
}
