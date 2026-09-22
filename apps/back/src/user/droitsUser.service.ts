import { ForbiddenException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { DepotModel } from '@dossier/depot/depot.model';
import { IntervenantForAuthentication } from '@referentiel/lanceleau/lanceleau.model';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaProvider } from '@masa/masa.provider';
import {
  ROLE,
  VERSEAU_ACCESS_DENIED_CODE,
  VERSEAU_ACCESS_DENIED_MESSAGE,
  VERSEAU_AUTHORIZED_ROLES,
  VerseauAccessClaims,
} from './user.model';

@Injectable()
export class DroitsUserService {
  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    private readonly masaProvider: MasaProvider,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DroitsUserService.name);
  }

  async resolveVerseauAccess(email: string): Promise<VerseauAccessClaims> {
    if (!email.trim()) {
      throw this.createAccessDeniedException();
    }

    try {
      const ag = await this.masaProvider.findAgByEmail(email);
      if (!ag) {
        throw this.createAccessDeniedException();
      }

      const roles = await this.masaProvider.findRolesByPrCdn(ag.principalIdentifiant);
      const roleCdns = new Set(roles?.map((role) => role.roleOrionId) ?? []);
      if (!VERSEAU_AUTHORIZED_ROLES.some((role) => roleCdns.has(role))) {
        throw this.createAccessDeniedException();
      }

      return {
        itvCdn: ag.intervenantId,
        isExpertNational: roleCdns.has(ROLE.EXPERT_NATIONAL_VERSEAU),
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Failed to check Verseau access: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
      throw new ServiceUnavailableException('Verseau rights repository is unavailable');
    }
  }

  async resolveItvCdn(sub: string): Promise<number | null> {
    const user = await this.userGateway.findBySub(sub);
    if (!user || !user.email) {
      return null;
    }

    const ag = await this.masaProvider.findAgByEmail(user.email);
    return ag ? ag.intervenantId : null;
  }

  async isExpertNationalVerseau(sub: string): Promise<boolean> {
    try {
      const user = await this.userGateway.findBySub(sub);
      if (!user?.email) {
        return false;
      }
      const ag = await this.masaProvider.findAgByEmail(user.email);
      if (!ag) {
        return false;
      }
      return await this.masaProvider.hasRole(ag.principalIdentifiant, ROLE.EXPERT_NATIONAL_VERSEAU);
    } catch (error) {
      this.logger.warn('Failed to check expert national role for user', sub, error);
      return false;
    }
  }

  async isExpertBassinVerseau(sub: string): Promise<boolean> {
    try {
      const user = await this.userGateway.findBySub(sub);
      if (!user?.email) {
        return false;
      }
      const ag = await this.masaProvider.findAgByEmail(user.email);
      if (!ag) {
        return false;
      }
      return await this.masaProvider.hasRole(ag.principalIdentifiant, ROLE.EXPERT_BASSIN_VERSEAU);
    } catch (error) {
      this.logger.warn('Failed to check expert bassin role for user', sub, error);
      return false;
    }
  }

  async canConsultDepot(sub: string, depot: DepotModel): Promise<boolean> {
    const itvCdn = await this.resolveItvCdn(sub);
    return !!itvCdn && Number(depot.itvCdn) === itvCdn;
  }

  async canConsultControle(sub: string, depotOfControle: DepotModel): Promise<boolean> {
    return this.canConsultDepot(sub, depotOfControle);
  }

  async findIntervenantByUserSub(sub: string): Promise<IntervenantForAuthentication | null> {
    try {
      const itvCdn = await this.resolveItvCdn(sub);
      if (itvCdn) {
        const intervenant = await this.masaProvider.findIntervenantById(itvCdn);
        return intervenant ? { itvCdn: intervenant.intervenantId, nom: intervenant.intervenantNom } : { itvCdn };
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to resolve intervenant for user', sub, error);
      return null;
    }
  }

  private createAccessDeniedException(): ForbiddenException {
    return new ForbiddenException({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      code: VERSEAU_ACCESS_DENIED_CODE,
      message: VERSEAU_ACCESS_DENIED_MESSAGE,
    });
  }
}
