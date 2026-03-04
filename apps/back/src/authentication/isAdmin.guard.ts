import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { CustomRequest } from '@shared/constants/customRequest';

@Injectable()
export class IsAdminGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(IsAdminGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      this.logger.warn('No authenticated user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    return authenticatedUser.isExpertNational;
  }
}
