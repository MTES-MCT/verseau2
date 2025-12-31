import { BaseEntity } from '../baseEntity';
import { DepotStep, DepotStatus, ControleStatus, ControleSandreStatus } from './depot.status';

export interface DepotDto extends BaseEntity {
  id: string;
  numeroDepotVerseau1?: number;
  nomOriginalFichier: string;
  path?: string;
  rapportPath?: string;
  tailleFichier: number;
  type: string;
  error?: string;
  step: DepotStep;
  status: DepotStatus;
  controleStatus?: ControleStatus;
  controleSandreStatus?: ControleSandreStatus;
}
