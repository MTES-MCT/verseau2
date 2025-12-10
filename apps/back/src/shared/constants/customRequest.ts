import { Request } from 'express';

export interface CustomRequest extends Request {
  // TODO: Ajouter le type de l'utilisateur
  user: any;
  correlationId: string;
  token: string;
}
