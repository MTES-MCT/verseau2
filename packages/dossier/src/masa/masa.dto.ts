import { BaseEntity } from '../baseEntity';

export enum MasaStatus {
  REFUSE = 'REFUSE',
  INTEGRE = 'INTEGRE',
  INTEGRATION_PARTIELLE = 'INTEGRATION_PARTIELLE',
}

export interface MasaDto extends BaseEntity {
  id: string;
  numeroDepotVerseau1: string | null;
  statut: MasaStatus;
  rapport: string | null;
}
