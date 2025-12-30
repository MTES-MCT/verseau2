import { UserEntity } from './user.entity';

export interface UserGateway {
  findBySub(sub: string): Promise<UserEntity | null>;
  findByItvCdn(itvCdn: string): Promise<UserEntity | null>;
  createUser(data: { sub: string; itvCdn: string; email?: string; nom?: string; prenom?: string }): Promise<UserEntity>;
  updateUser(id: string, data: Partial<Pick<UserEntity, 'email' | 'nom' | 'prenom'>>): Promise<UserEntity>;
}

export const UserGateway = Symbol('UserGateway');
