import { UserModel } from './user.model';

export interface UserGateway {
  findBySub(sub: string): Promise<UserModel | null>;
  findByItvCdn(itvCdn: string): Promise<UserModel | null>;
  createUser(data: { sub: string; itvCdn: string; email?: string; nom?: string; prenom?: string }): Promise<UserModel>;
  updateUser(id: string, data: Partial<Pick<UserModel, 'email' | 'nom' | 'prenom'>>): Promise<UserModel>;
}

export const UserGateway = Symbol('UserGateway');
