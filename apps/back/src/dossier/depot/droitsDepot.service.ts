import { Injectable, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { UserGateway } from '@user/user.gateway';
import { DroitsUserService } from '@user/droitsUser.service';
import { MasaProvider } from '@masa/masa.provider';
import { ROLE } from '@user/user.model';

@Injectable()
export class DroitsDepotService {
  constructor(
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(LoggerService) private readonly logger: LoggerService,
    private readonly droitsUserService: DroitsUserService,
    private readonly masaProvider: MasaProvider,
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

    const isExpert = await this.droitsUserService.isExpertNationalVerseau(subId);
    if (isExpert) {
      this.logger.log('Expert national Verseau — droits de dépôt accordés sans restriction', { subId });
      return;
    }

    const user = await this.userGateway.findBySub(subId);
    this.logger.log('Checking droits de depot for user', user);
    if (!user) {
      throw new ForbiddenException(`Utilisateur non trouvé : ${subId}`);
    }
    if (!user.email) {
      throw new ForbiddenException(`Email manquant pour l'utilisateur : ${subId}`);
    }

    const ag = await this.masaProvider.findAgByEmail(user.email);
    this.logger.log('Ag entity found', ag);
    if (!ag) {
      throw new ForbiddenException(`Aucun lien intervenant trouvé pour l'utilisateur ${user.email}`);
    }

    const hasRoleDeposant = await this.masaProvider.hasRole(ag.prCdn, ROLE.DEPOSANT);
    this.logger.log('Deposant role found', hasRoleDeposant);
    if (!hasRoleDeposant) {
      throw new ForbiddenException(`L'utilisateur n'a pas le rôle déposant requis pour le dépôt`);
    }

    const intervenant = await this.masaProvider.findIntervenantById(ag.itvCdn);
    this.logger.log('Intervenant found', { itvCdn: intervenant?.itvCdn, siret: intervenant?.itvRfa });
    if (!intervenant?.itvRfa) {
      throw new ForbiddenException(`Intervenant non trouvé ou SIRET manquant`);
    }
    const userSiret = intervenant.itvRfa;

    this.logger.log(
      'Validating droits de depot for cdOuvrageDepollutionList',
      cdOuvrageDepollutionList,
      cdSystemeCollecteList,
    );
    const matches = await this.masaProvider.findVSteuSclItvByCodes(cdOuvrageDepollutionList, cdSystemeCollecteList);
    this.logger.log('VSteuSclItv entities found', matches);

    for (const code of cdOuvrageDepollutionList) {
      const matchesForCode = matches.filter((m) => m.steuCda === code);

      if (matchesForCode.length === 0) {
        throw new ForbiddenException(`L'ouvrage de dépollution ${code} n'a pas été trouvé`);
      }

      const hasRights = matchesForCode.some(
        (m) => m.moItvRfa === userSiret || m.satItvRfa === userSiret || m.aeItvRfa === userSiret,
      );
      if (!hasRights) {
        throw new ForbiddenException(`Vous n'avez pas les droits de dépôt pour l'ouvrage de dépollution ${code}`);
      }
    }

    for (const code of cdSystemeCollecteList) {
      const matchesForCode = matches.filter((m) => m.sclCda === code);

      if (matchesForCode.length === 0) {
        throw new ForbiddenException(`Le système de collecte ${code} n'a pas été trouvé`);
      }

      const hasRights = matchesForCode.some(
        (m) => m.moItvRfa === userSiret || m.satItvRfa === userSiret || m.aeItvRfa === userSiret,
      );
      if (!hasRights) {
        throw new ForbiddenException(`Vous n'avez pas les droits de dépôt pour le système de collecte ${code}`);
      }
    }
  }
}
