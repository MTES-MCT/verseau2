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

  async findByItvCdn(itvCdn: string): Promise<UserEntity | null> {
    return await this.findOne({ where: { itvCdn } });
  }

  async createUser(data: { sub: string; itvCdn: string }): Promise<UserEntity> {
    const newUser = this.create(data);
    return await this.save(newUser);
  }
}
