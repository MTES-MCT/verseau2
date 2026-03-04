import { UserModel } from './user.model';

export interface UserGateway {
  findById(id: string): Promise<UserModel | null>;
  findBySub(sub: string): Promise<UserModel | null>;
  createUser(data: { sub: string; email?: string; nom?: string; prenom?: string }): Promise<UserModel>;
  updateUser(id: string, data: Partial<Pick<UserModel, 'email' | 'nom' | 'prenom'>>): Promise<UserModel>;
}

export const UserGateway = Symbol('UserGateway');
