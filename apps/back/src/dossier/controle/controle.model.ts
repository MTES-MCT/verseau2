import { ControleEntity } from './controle.entity';

export type ControleModel = Pick<
  ControleEntity,
  'id' | 'name' | 'type' | 'success' | 'error' | 'errorParams' | 'depot' | 'evenementType' | 'createdAt' | 'updatedAt'
>;

export type ControleModelWithoutDepot = Omit<ControleModel, 'depot'>;

export type CreateControleModel = Pick<
  ControleEntity,
  'name' | 'type' | 'success' | 'error' | 'depotId' | 'evenementType' | 'errorParams'
>;
