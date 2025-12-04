import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { UserEntity } from './user.entity';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';

@Injectable()
export class UserService {
  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
  ) {}

  async findOrCreateUser(sub: string, itvCdn: string): Promise<UserEntity> {
    // Validate ITV exists in referentiel
    const itv = await this.lanceleauGateway.findByItvCdn(itvCdn);
    if (!itv) {
      throw new BadRequestException(`ITV with itvCdn ${itvCdn} does not exist in referentiel`);
    }

    // Find existing user by sub
    const existingUser = await this.userGateway.findBySub(sub);
    if (existingUser) {
      return existingUser;
    }

    // Create new user
    return await this.userGateway.createUser({ sub, itvCdn });
  }

  async findBySub(sub: string): Promise<UserEntity> {
    const user = await this.userGateway.findBySub(sub);
    if (!user) {
      throw new NotFoundException(`User with sub ${sub} not found`);
    }
    return user;
  }
}
