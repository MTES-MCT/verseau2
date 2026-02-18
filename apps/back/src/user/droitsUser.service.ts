import { Inject, Injectable } from '@nestjs/common';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { UserGateway } from './user.gateway';
import { DepotModel } from '@dossier/depot/depot.model';
import { IntervenantForAuthentication } from '@referentiel/lanceleau/lanceleau.model';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class DroitsUserService {
  private readonly ROLE_EXPERT_NATIONAL_VERSEAU: number = 305;

  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DroitsUserService.name);
  }

  async resolveItvCdn(sub: string): Promise<number | null> {
    const user = await this.userGateway.findBySub(sub);
    if (!user || !user.email) {
      return null;
    }

    const ag = await this.lanceleauGateway.findAgByEmail(user.email);
    return ag ? ag.itvCdn : null;
  }

  async isExpertNationalVerseau(sub: string): Promise<boolean> {
    try {
      const user = await this.userGateway.findBySub(sub);
      if (!user?.email) {
        return false;
      }
      const ag = await this.lanceleauGateway.findAgByEmail(user.email);
      if (!ag) {
        return false;
      }
      const role = await this.lanceleauGateway.findOrionRoleForPrincipal(ag.prCdn, this.ROLE_EXPERT_NATIONAL_VERSEAU);
      return !!role;
    } catch (error) {
      this.logger.warn('Failed to check expert national role for user', sub, error);
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
        const itvEntity = await this.lanceleauGateway.findByItvCdn(itvCdn);
        return {
          itvCdn,
          nom: itvEntity?.itvNomLb,
        };
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to resolve intervenant for user', sub, error);
      return null;
    }
  }
}
