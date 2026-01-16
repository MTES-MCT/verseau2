import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { UserGateway } from './user.gateway';

@Injectable()
export class UserRepository extends Repository<UserEntity> implements UserGateway {
  constructor(private dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  async findBySub(sub: string): Promise<UserEntity | null> {
    return await this.findOne({ where: { sub } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.findOne({ where: { id } });
  }

  async findByItvCdn(itvCdn: string): Promise<UserEntity | null> {
    return await this.findOne({ where: { itvCdn } });
  }

  async createUser(data: {
    sub: string;
    itvCdn: string;
    email?: string;
    nom?: string;
    prenom?: string;
  }): Promise<UserEntity> {
    const newUser = this.create(data);
    return await this.save(newUser);
  }

  async updateUser(id: string, data: Partial<Pick<UserEntity, 'email' | 'nom' | 'prenom'>>): Promise<UserEntity> {
    await this.update(id, data);
    const updatedUser = await this.findOne({ where: { id } });
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return updatedUser;
  }
}
