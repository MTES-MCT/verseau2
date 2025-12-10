import { DepotEntity } from './depot.entity';

export type DepotModel = Pick<
  DepotEntity,
  | 'id'
  | 'nomOriginalFichier'
  | 'tailleFichier'
  | 'path'
  | 'type'
  | 'error'
  | 'step'
  | 'status'
  | 'controleV1Status'
  | 'controleSandreStatus'
  | 'user'
  | 'createdAt'
  | 'updatedAt'
>;

export type CreateDepotModel = Omit<DepotModel, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'step' | 'status'>;
