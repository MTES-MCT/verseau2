import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { UserModel } from './user.model';

@Injectable()
export class UserService {
  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
  ) {}

  async findOrCreateUser(sub: string, claims?: { email?: string; nom?: string; prenom?: string }): Promise<UserModel> {
    // Find existing user by sub
    const existingUser = await this.userGateway.findBySub(sub);
    if (existingUser) {
      // Update user claims if provided
      if (
        claims &&
        (claims.email !== existingUser.email ||
          claims.nom !== existingUser.nom ||
          claims.prenom !== existingUser.prenom)
      ) {
        return await this.userGateway.updateUser(existingUser.id, claims);
      }
      return existingUser;
    }

    // Create new user
    return await this.userGateway.createUser({ sub, ...claims });
  }

  async findBySub(sub: string): Promise<UserModel> {
    const user = await this.userGateway.findBySub(sub);
    if (!user) {
      throw new NotFoundException(`User with sub ${sub} not found`);
    }
    return user;
  }

  async findById(id: string): Promise<UserModel> {
    const user = await this.userGateway.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}
