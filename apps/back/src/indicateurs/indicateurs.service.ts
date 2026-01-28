import { Inject, Injectable, LOG_LEVELS, Logger } from '@nestjs/common';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { UserGateway } from '@user/user.gateway';
import { IndicateurSteuDto } from '@lib/dossier';
import { TraceCalls } from '../shared/logger/traceCalls.decorator';
import { IndicateursGateway } from './indicateurs.gateway';

@Injectable()
export class IndicateursService {
  private readonly logger = new Logger(IndicateursService.name);

  constructor(
    @Inject(IndicateursGateway) private readonly indicateursRepository: IndicateursGateway,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
    @Inject(UserGateway) private readonly userGateway: UserGateway,
  ) {}

  @TraceCalls(LOG_LEVELS[2])
  async getIndicateursSteu(subId: string): Promise<IndicateurSteuDto[]> {
    const user = await this.userGateway.findBySub(subId);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé pour subId: ${subId}`);
      return [];
    }

    const ag = await this.lanceleauGateway.findAgByEmail(user.email);
    if (!ag) {
      this.logger.warn(`Aucun lien intervenant trouvé pour l'utilisateur ${user.email}`);
      return [];
    }

    const itv = await this.lanceleauGateway.findByItvCdn(ag.itvCdn);
    if (!itv || !itv.itvRfa) {
      this.logger.warn(`Intervenant non trouvé ou SIRET manquant pour l'utilisateur ${user.email}`);
      return [];
    }

    const userSiret = itv.itvRfa;

    // Récupérer les codes SANDRE autorisés pour cet intervenant
    const authorizedSteus = await this.lanceleauGateway.findVSteuSclItvByItvRfa(userSiret);
    const steuCodes = authorizedSteus.map((s) => s.steuCda).filter((code) => !!code);

    if (steuCodes.length === 0) {
      return [];
    }

    return this.indicateursRepository.findIndicateursSteu(steuCodes);
  }
}
