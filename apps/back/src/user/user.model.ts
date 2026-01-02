import { UserEntity } from './user.entity';

export type UserModel = Pick<
  UserEntity,
  'id' | 'sub' | 'itvCdn' | 'email' | 'nom' | 'prenom' | 'createdAt' | 'updatedAt'
>;
