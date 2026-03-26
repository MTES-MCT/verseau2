import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { UserGateway } from '@user/user.gateway';
import { DroitsUserService } from '@user/droitsUser.service';
import { MasaProvider } from '@masa/masa.provider';
import { ROLE } from '@user/user.model';
import { DepotError, DepotRightsException } from './depotError';

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
    isFluxQualifie: boolean = false,
  ): Promise<void> {
    if (cdOuvrageDepollutionList.length === 0 && cdSystemeCollecteList.length === 0) {
      throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
    }

    const isExpertNational = await this.droitsUserService.isExpertNationalVerseau(subId);
    if (isExpertNational) {
      this.logger.log('Expert national Verseau — droits de dépôt accordés sans restriction', { subId });
      return;
    }

    const user = await this.userGateway.findBySub(subId);
    this.logger.log('Checking droits de depot for user', user);
    if (!user) {
      throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
    }
    if (!user.email) {
      throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
    }

    const ag = await this.masaProvider.findAgByEmail(user.email);
    this.logger.log('Ag entity found', ag);
    if (!ag) {
      throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
    }

    const roles = await this.masaProvider.findRolesByPrCdn(ag.principalIdentifiant);
    const roleCdns = new Set(roles?.map((r) => r.roleCdn));
    const hasRoleDeposantOrExpertBassin = roleCdns.has(ROLE.DEPOSANT) || roleCdns.has(ROLE.EXPERT_BASSIN_VERSEAU);
    this.logger.log('hasRoleDeposantOrExpertBassin', hasRoleDeposantOrExpertBassin);
    if (!hasRoleDeposantOrExpertBassin) {
      throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
    }

    const intervenant = await this.masaProvider.findIntervenantById(ag.intervenantIdentifiant);
    this.logger.log('Intervenant found', {
      intervenantIdentifiant: intervenant?.intervenantIdentifiant,
      siret: intervenant?.intervenantSiret,
    });
    if (!intervenant?.intervenantSiret) {
      throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
    }
    const userSiret = intervenant.intervenantSiret;

    this.logger.log(
      'Validating droits de depot for cdOuvrageDepollutionList',
      cdOuvrageDepollutionList,
      cdSystemeCollecteList,
    );
    const matches = await this.masaProvider.findVSteuSclItvByCodes(cdOuvrageDepollutionList, cdSystemeCollecteList);
    this.logger.log('VSteuSclItv entities found', matches);

    for (const code of cdOuvrageDepollutionList) {
      const matchesForCode = matches.filter((m) => m.ouvrageDepollutionCode === code);

      if (matchesForCode.length === 0) {
        throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
      }

      const hasRights = matchesForCode.some(
        (m) =>
          m.maitreOuvrageSiret === userSiret ||
          m.prestataireAutosurveillanceSiret === userSiret ||
          m.agenceEauSiret === userSiret,
      );
      if (!hasRights) {
        throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
      }
    }

    for (const code of cdSystemeCollecteList) {
      const matchesForCode = matches.filter((m) => m.systemeCollecteCode === code);

      if (matchesForCode.length === 0) {
        throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
      }

      const hasRights = matchesForCode.some(
        (m) =>
          m.maitreOuvrageSiret === userSiret ||
          m.prestataireAutosurveillanceSiret === userSiret ||
          m.agenceEauSiret === userSiret,
      );
      if (!hasRights) {
        throw new DepotRightsException(DepotError.DROITS_INSUFFISANTS);
      }
    }

    if (isFluxQualifie) {
      const isExpertBassin = await this.droitsUserService.isExpertBassinVerseau(subId);
      if (!isExpertBassin) {
        throw new DepotRightsException(DepotError.FLUX_QUALIFIE_INTERDIT);
      }
    }
  }
}
