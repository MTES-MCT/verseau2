import { ReponseSandreEntity } from './reponseSandre.entity';

export type ReponseSandreModel = Pick<
  ReponseSandreEntity,
  | 'id'
  | 'jeton'
  | 'acceptationStatus'
  | 'isConformant'
  | 'codeScenario'
  | 'versionScenario'
  | 'errorCode'
  | 'errorMessage'
  | 'errorLocation'
  | 'errorLigne'
  | 'errorColonne'
  | 'errorSeverite'
  | 'depot'
  | 'createdAt'
  | 'updatedAt'
>;

export type ReponseSandreCreateModel = Omit<ReponseSandreModel, 'id' | 'createdAt' | 'updatedAt' | 'depot'> & {
  depotId: string;
};
