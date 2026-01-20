import { Inject, Injectable } from '@nestjs/common';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { UserGateway } from './user.gateway';
import { DepotModel } from '@dossier/depot/depot.model';

@Injectable()
export class DroitsUserService {
  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
  ) {}

  async resolveItvCdn(sub: string): Promise<number | null> {
    const user = await this.userGateway.findBySub(sub);
    if (!user || !user.email) {
      return null;
    }

    const ag = await this.lanceleauGateway.findAgByEmail(user.email);
    return ag ? ag.itvCdn : null;
  }

  async canConsultDepot(sub: string, depot: DepotModel): Promise<boolean> {
    const itvCdn = await this.resolveItvCdn(sub);
    return !!itvCdn && Number(depot.itvCdn) === itvCdn;
  }

  async canConsultControle(sub: string, depotOfControle: DepotModel): Promise<boolean> {
    return this.canConsultDepot(sub, depotOfControle);
  }
}
