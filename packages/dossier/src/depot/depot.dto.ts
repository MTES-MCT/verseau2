import { BaseEntity } from '../baseEntity';

export interface DepotDto extends BaseEntity {
  id: string;
  nomOriginalFichier: string;
  path: string;
  tailleFichier: number;
  type: string;
  error?: string;
}
