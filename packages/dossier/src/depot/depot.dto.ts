import { BaseEntity } from '../baseEntity';
import { DepotStatus, EtapeMetier } from './depot.status';

export interface DepotDto extends BaseEntity {
  id: string;
  numeroDepotVerseau1?: string;
  nomOriginalFichier: string;
  status: DepotStatus;
  etapeMetier?: EtapeMetier;
  rapportPath?: string;
}
