import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { DepotModel } from '@dossier/depot/depot.model';
import { IntervenantForAuthentication } from '@referentiel/lanceleau/lanceleau.model';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaProvider } from '@masa/masa.provider';

@Injectable()
export class DroitsUserService {
  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    private readonly masaProvider: MasaProvider,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DroitsUserService.name);
  }

  async resolveItvCdn(sub: string): Promise<number | null> {
    const user = await this.userGateway.findBySub(sub);
    if (!user || !user.email) {
      return null;
    }

    const ag = await this.masaProvider.findAgByEmail(user.email);
    return ag ? ag.itvCdn : null;
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
      return await this.masaProvider.isExpertNationalVerseau(ag.prCdn);
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
        const intervenant = await this.masaProvider.findIntervenantById(itvCdn);
        return intervenant ? { itvCdn: intervenant.itvCdn, nom: intervenant.nom } : { itvCdn };
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to resolve intervenant for user', sub, error);
      return null;
    }
  }
}
