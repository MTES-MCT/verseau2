import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { CustomRequest } from '@shared/constants/customRequest';
import { DroitsUserService } from '@user/droitsUser.service';

@Injectable()
export class IsAdminGuard implements CanActivate {
  constructor(
    private readonly logger: LoggerService,
    private readonly droitsUserService: DroitsUserService,
  ) {
    this.logger.setContext(IsAdminGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      this.logger.warn('No authenticated user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    return this.droitsUserService.isExpertNationalVerseau(authenticatedUser.cerbereId);
  }
}
