import { UserEntity } from './user.entity';

export type UserModel = Pick<UserEntity, 'id' | 'sub' | 'email' | 'nom' | 'prenom' | 'createdAt' | 'updatedAt'>;
