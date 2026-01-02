import { BaseEntity } from '../baseEntity';
import { DepotStep, DepotStatus } from './depot.status';

export interface DepotDto extends BaseEntity {
  id: string;
  numeroDepotVerseau1?: string;
  nomOriginalFichier: string;
  step: DepotStep;
  status: DepotStatus;
  rapportPath?: string;
}
