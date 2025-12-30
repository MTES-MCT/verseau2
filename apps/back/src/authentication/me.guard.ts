import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { CustomRequest } from '@shared/constants/customRequest';

/**
 * Guard to ensure that a user can only access their own information.
 * For the /me endpoint, this verifies that the user is authenticated.
 * The identity is implicitly verified as the information returned is based on the token owner.
 */
@Injectable()
export class MeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return true;
  }
}
