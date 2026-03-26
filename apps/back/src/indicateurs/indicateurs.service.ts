import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import { UserGateway } from '@user/user.gateway';
import { IndicateurSteuDto } from '@lib/dossier';
import { TraceCalls } from '../shared/logger/traceCalls.decorator';
import { IndicateursGateway } from './indicateurs.gateway';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaProvider } from '@masa/masa.provider';

@Injectable()
export class IndicateursService {
  constructor(
    @Inject(IndicateursGateway) private readonly indicateursRepository: IndicateursGateway,
    private readonly masaProvider: MasaProvider,
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(IndicateursService.name);
  }

  @TraceCalls(LOG_LEVELS[2])
  async getIndicateursSteu(subId: string): Promise<IndicateurSteuDto[]> {
    const user = await this.userGateway.findBySub(subId);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé pour subId: ${subId}`);
      return [];
    }

    const siret = await this.masaProvider.findSiretByEmail(user.email);
    if (!siret) {
      this.logger.warn(`Aucun intervenant avec SIRET trouvé pour l'utilisateur ${user.email}`);
      return [];
    }

    // Récupérer les codes SANDRE autorisés pour cet intervenant (données live verseau)
    const authorizedSteus = await this.masaProvider.findVSteuSclItvByItvRfa(siret);
    const steuCodes = authorizedSteus.map((s) => s.codeOuvrageDepollution).filter((code) => !!code);

    if (steuCodes.length === 0) {
      return [];
    }

    return this.indicateursRepository.findIndicateursSteu(steuCodes);
  }
}
