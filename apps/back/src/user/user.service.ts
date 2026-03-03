import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { UserModel } from './user.model';
import { normalizeEmail } from '@shared/service/string.service';

@Injectable()
export class UserService {
  constructor(@Inject(UserGateway) private readonly userGateway: UserGateway) {}

  async findOrCreateUser(sub: string, claims?: { email?: string; nom?: string; prenom?: string }): Promise<UserModel> {
    // Normalize email to lowercase for consistent matching with Lanceleau referential
    const normalizedClaims = claims?.email ? { ...claims, email: normalizeEmail(claims.email) } : claims;

    // Find existing user by sub
    const existingUser = await this.userGateway.findBySub(sub);
    if (existingUser) {
      // Update user claims if provided
      if (
        normalizedClaims &&
        (normalizedClaims.email !== existingUser.email ||
          normalizedClaims.nom !== existingUser.nom ||
          normalizedClaims.prenom !== existingUser.prenom)
      ) {
        return await this.userGateway.updateUser(existingUser.id, normalizedClaims);
      }
      return existingUser;
    }

    // Create new user
    return await this.userGateway.createUser({ sub, ...normalizedClaims });
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
