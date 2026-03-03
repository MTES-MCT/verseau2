import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { DepotService } from '@dossier/depot/depot.service';
import { CustomRequest } from '@shared/constants/customRequest';

@Injectable()
export class HasUserAccessToDepotGuard implements CanActivate {
  constructor(
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
  ) {
    this.logger.setContext('HasUserAccessToDepotGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const authenticatedUser = request.user;

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

    // Find the depot
    const depot = await this.depotService.findById(depotId);

    // Compare itvCdn depuis le token JWT interne avec celui du dépôt
    const userItvCdn = authenticatedUser.itvCdn;
    const canConsult = !!userItvCdn && Number(depot.itvCdn) === userItvCdn;

    if (!canConsult) {
      this.logger.warn('User does not have access to depot', {
        sub: authenticatedUser.cerbereId,
        depotId: depot.id,
      });
      throw new ForbiddenException('You do not have access to this depot');
    }

    return true;
  }
}
