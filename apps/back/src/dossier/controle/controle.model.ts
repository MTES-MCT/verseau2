import { ControleEntity } from './controle.entity';

export type ControleModel = Pick<
  ControleEntity,
  'id' | 'name' | 'success' | 'error' | 'errorParams' | 'depot' | 'createdAt' | 'updatedAt'
>;

export type CreateControleModel = Pick<ControleEntity, 'name' | 'success' | 'error' | 'depotId' | 'errorParams'>;
