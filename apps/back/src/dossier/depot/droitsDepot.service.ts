import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LoggerService } from '@shared/logger/logger.service';
import { UserGateway } from '@user/user.gateway';

@Injectable()
export class DroitsDepotService {
  constructor(
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(LoggerService) private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DroitsDepotService.name);
  }

  async validateDroits(
    subId: string,
    cdOuvrageDepollutionList: string[],
    cdSystemeCollecteList: string[],
  ): Promise<void> {
    if (cdOuvrageDepollutionList.length === 0 && cdSystemeCollecteList.length === 0) {
      throw new ForbiddenException('Aucun code fourni pour la validation des droits de dépôt');
    }

    const user = await this.userGateway.findBySub(subId);
    this.logger.log('Checking droits de depot for user', user);
    if (!user) {
      throw new ForbiddenException(`Utilisateur non trouvé : ${subId}`);
    }

    const ag = await this.lanceleauGateway.findAgByEmail(user.email);
    this.logger.log('Ag entity found', ag);
    if (!ag) {
      throw new ForbiddenException(`Aucun lien intervenant trouvé pour l'utilisateur ${user.email}`);
    }

    const role = await this.lanceleauGateway.findOrionRoleForPrincipal(ag.prCdn, 301);
    this.logger.log('Orion role found', role);
    if (!role) {
      throw new ForbiddenException(`L'utilisateur n'a pas le rôle 301 requis pour le dépôt`);
    }

    const itv = await this.lanceleauGateway.findByItvCdn(ag.itvCdn);
    this.logger.log('Intervenant found', { itvCdn: itv?.itvCdn, itvRfa: itv?.itvRfa });
    if (!itv || !itv.itvRfa) {
      throw new ForbiddenException(`Intervenant non trouvé ou SIRET manquant`);
    }
    const userSiret = itv.itvRfa;

    this.logger.log(
      'Validating droits de depot for cdOuvrageDepollutionList',
      cdOuvrageDepollutionList,
      cdSystemeCollecteList,
    );
    const matches = await this.lanceleauGateway.findVSteuSclItvByCodes(cdOuvrageDepollutionList, cdSystemeCollecteList);
    this.logger.log('VSteuSclItv entities found', matches);

    for (const code of cdOuvrageDepollutionList) {
      const matchesForCode = matches.filter((m) => m.steuCda === code);

      if (matchesForCode.length === 0) {
        throw new ForbiddenException(`L'ouvrage de dépollution ${code} n'a pas été trouvé`);
      }

      if (!matchesForCode.some((m) => m.moItvRfa === userSiret)) {
        throw new ForbiddenException(`Vous n'avez pas les droits de dépôt pour l'ouvrage de dépollution ${code}`);
      }
    }

    for (const code of cdSystemeCollecteList) {
      const matchesForCode = matches.filter((m) => m.sclCda === code);

      if (matchesForCode.length === 0) {
        throw new ForbiddenException(`Le système de collecte ${code} n'a pas été trouvé`);
      }

      if (!matchesForCode.some((m) => m.moItvRfa === userSiret)) {
        throw new ForbiddenException(`Vous n'avez pas les droits de dépôt pour le système de collecte ${code}`);
      }
    }
  }
}
