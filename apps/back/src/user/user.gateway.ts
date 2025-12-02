import { UserEntity } from './user.entity';

export interface UserGateway {
  findBySub(sub: string): Promise<UserEntity | null>;
  findByItvCdn(itvCdn: string): Promise<UserEntity | null>;
  createUser(data: { sub: string; itvCdn: string }): Promise<UserEntity>;
}

export const UserGateway = Symbol('UserGateway');
