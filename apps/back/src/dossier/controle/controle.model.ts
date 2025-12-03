import { ControleEntity } from './controle.entity';

export type ControleModel = Pick<
  ControleEntity,
  'id' | 'name' | 'status' | 'error' | 'depot' | 'createdAt' | 'updatedAt'
>;

export type CreateControleModel = Pick<ControleEntity, 'name' | 'error' | 'depotId'>;
