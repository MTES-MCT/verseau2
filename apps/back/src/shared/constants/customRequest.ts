import { Request } from 'express';
import { AuthenticatedUser } from '@authentication/authentication';

//TODO : déplacer AuthenticatedUser dans shared, car shared ne devrait pas dépendre d'authentication
export interface CustomRequest extends Request {
  user: AuthenticatedUser;
  correlationId: string;
  token: string;
}
