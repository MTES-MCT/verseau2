import { DepotEntity } from './depot.entity';

export type DepotModel = Pick<
  DepotEntity,
  'id' | 'nomOriginalFichier' | 'tailleFichier' | 'path' | 'type' | 'error' | 'user' | 'createdAt' | 'updatedAt'
>;
