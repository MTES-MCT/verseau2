import { UserEntity } from './user.entity';

export type UserModel = Pick<UserEntity, 'id' | 'sub' | 'email' | 'nom' | 'prenom' | 'createdAt' | 'updatedAt'>;

export enum ROLE {
  DEPOSANT = 301,
  EXPERT_BASSIN_VERSEAU = 303,
  EXPERT_NATIONAL_VERSEAU = 305,
  EXPERT_CENTRAL_VERSEAU = 306,
  EXPERT_SERVICE_VERSEAU = 307,
  DEPOSANT_SATESE = 308,
}

export const VERSEAU_AUTHORIZED_ROLES: readonly ROLE[] = [
  ROLE.DEPOSANT,
  ROLE.EXPERT_BASSIN_VERSEAU,
  ROLE.EXPERT_NATIONAL_VERSEAU,
  ROLE.EXPERT_CENTRAL_VERSEAU,
  ROLE.EXPERT_SERVICE_VERSEAU,
  ROLE.DEPOSANT_SATESE,
];
