import { EtapeMetier } from '@lib/dossier';
import { DepotEntity } from './depot.entity';

export type DepotModel = Pick<
  DepotEntity,
  | 'id'
  | 'nomOriginalFichier'
  | 'tailleFichier'
  | 'path'
  | 'rapportPath'
  | 'type'
  | 'error'
  | 'step'
  | 'status'
  | 'controleStatus'
  | 'controleSandreStatus'
  | 'user'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'masa'
> & { etapeMetier?: EtapeMetier };

export type CreateDepotModel = Omit<DepotModel, 'id' | 'createdAt' | 'updatedAt' | 'step' | 'status' | 'user'>;
