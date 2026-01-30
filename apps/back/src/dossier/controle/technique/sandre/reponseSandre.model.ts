import { ReponseSandreEntity } from './reponseSandre.entity';

export type ReponseSandreModel = Pick<
  ReponseSandreEntity,
  | 'id'
  | 'jeton'
  | 'acceptationStatus'
  | 'isConformant'
  | 'codeScenario'
  | 'versionScenario'
  | 'errors'
  | 'raw'
  | 'depot'
  | 'createdAt'
  | 'updatedAt'
>;

export type ReponseSandreCreateModel = Omit<ReponseSandreModel, 'id' | 'createdAt' | 'updatedAt' | 'depot'> & {
  depotId: string;
};
