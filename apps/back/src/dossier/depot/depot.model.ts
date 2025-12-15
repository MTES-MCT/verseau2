import { DepotEntity } from './depot.entity';

export type DepotModel = Pick<
  DepotEntity,
  | 'id'
  | 'numeroDepotVerseau1'
  | 'nomOriginalFichier'
  | 'tailleFichier'
  | 'path'
  | 'type'
  | 'error'
  | 'step'
  | 'status'
  | 'controleStatus'
  | 'controleSandreStatus'
  | 'user'
  | 'createdAt'
  | 'updatedAt'
>;

export type CreateDepotModel = Omit<DepotModel, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'step' | 'status'>;
