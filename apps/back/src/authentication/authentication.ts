export interface Authentication {
  validateToken(token: string): Promise<AuthenticatedUser>;
}

export interface AuthenticatedUser {
  sub: string;
  [key: string]: unknown;
}

export const Authentication = Symbol('Authentication');
