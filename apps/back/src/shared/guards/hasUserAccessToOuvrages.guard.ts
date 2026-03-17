import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { MasaProvider } from '@masa/masa.provider';
import { LoggerService } from '@shared/logger/logger.service';
import { CustomRequest } from '@shared/constants/customRequest';

@Injectable()
export class HasUserAccessToOuvragesGuard implements CanActivate {
  constructor(
    private readonly logger: LoggerService,
    private readonly masaProvider: MasaProvider,
  ) {
    this.logger.setContext('HasUserAccessToOuvragesGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const { itvCdn } = request.user;

    if (itvCdn === null) {
      this.logger.warn('User has no itvCdn — access to ouvrages denied');
      throw new ForbiddenException('User is not linked to an intervenant');
    }

    const intervenant = await this.masaProvider.findIntervenantById(itvCdn);

    if (!intervenant?.itvRfa) {
      this.logger.warn('No intervenant or itvRfa found for user', { itvCdn });
      throw new ForbiddenException('User intervenant not found');
    }

    const entries = await this.masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);

    const authorizedSteuCdas = [...new Set(entries.map((e) => e.steuCda).filter(Boolean))];
    const authorizedSclCdas = [...new Set(entries.map((e) => e.sclCda).filter(Boolean))];

    if (authorizedSteuCdas.length === 0 && authorizedSclCdas.length === 0) {
      this.logger.warn('User has no authorized ouvrages', { itvCdn, itvRfa: intervenant.itvRfa });
      throw new ForbiddenException('User has no authorized ouvrages');
    }

    request.authorizedSteuCdas = authorizedSteuCdas;
    request.authorizedSclCdas = authorizedSclCdas;

    return true;
  }
}
