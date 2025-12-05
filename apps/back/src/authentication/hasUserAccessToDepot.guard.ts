import { Authentication, AuthenticatedUser } from './authentication';
import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { REQUEST_USER_KEY } from './authentication.guard';
import { DepotService } from '@dossier/depot/depot.service';
import { UserService } from '@user/user.service';
import { Request } from 'express';

@Injectable()
export class HasUserAccessToDepotGuard implements CanActivate {
  constructor(
    @Inject(Authentication) private readonly authentication: Authentication,
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
    private readonly userService: UserService,
  ) {
    this.logger.setContext('HasUserAccessToDepotGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authenticatedUser = request[REQUEST_USER_KEY] as AuthenticatedUser;

    if (!authenticatedUser) {
      this.logger.warn('No authenticated user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Get depot ID from route params (supports both :id and :depotId)
    const depotId = request.params.id || request.params.depotId;

    if (!depotId) {
      this.logger.warn('No depot ID found in request params');
      throw new ForbiddenException('Depot ID is required');
    }

    // TODO: improve performance by using CLS to avoid multiple database calls
    // Find the user by their cerbereId (OIDC subject claim)
    const user = await this.userService.findBySub(authenticatedUser.cerbereId);

    // Find the depot
    const depot = await this.depotService.findById(depotId);

    // Check if the depot belongs to the authenticated user
    if (depot.user?.id !== user.id) {
      this.logger.warn('User does not have access to depot', {
        userId: user.id,
        depotId: depot.id,
      });
      throw new ForbiddenException('You do not have access to this depot');
    }

    return true;
  }
}
