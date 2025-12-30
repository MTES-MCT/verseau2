import { DepotEntity } from './depot.entity';

export type DepotModel = Pick<
  DepotEntity,
  | 'id'
  | 'numeroDepotVerseau1'
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
>;

export type CreateDepotModel = Omit<DepotModel, 'id' | 'createdAt' | 'updatedAt' | 'step' | 'status' | 'user'>;
