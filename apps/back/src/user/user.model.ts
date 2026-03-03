import { UserEntity } from './user.entity';

export type UserModel = Pick<UserEntity, 'id' | 'sub' | 'email' | 'nom' | 'prenom' | 'createdAt' | 'updatedAt'>;

export enum ROLE {
  DEPOSANT = 301,
  EXPERT_NATIONAL_VERSEAU = 305,
}
