import { BaseEntity } from '../baseEntity';
import { DepotStep, DepotStatus } from './depot.status';

export interface DepotDto extends BaseEntity {
  id: string;
  nomOriginalFichier: string;
  path?: string;
  tailleFichier: number;
  type: string;
  error?: string;
  step: DepotStep;
  status: DepotStatus;
}
