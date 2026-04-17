import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import { UserGateway } from '@user/user.gateway';
import { type PaginatedIndicateurSteuResponse } from '@lib/dossier';
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
  async getIndicateursSteu(subId: string, page: number, pageSize: number): Promise<PaginatedIndicateurSteuResponse> {
    const user = await this.userGateway.findBySub(subId);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé pour subId: ${subId}`);
      return { data: [], total: 0, page, pageSize };
    }

    const siret = await this.masaProvider.findSiretByEmail(user.email);
    if (!siret) {
      this.logger.warn(`Aucun intervenant avec SIRET trouvé pour l'utilisateur ${user.email}`);
      return { data: [], total: 0, page, pageSize };
    }

    // Récupérer les codes SANDRE autorisés pour cet intervenant (données live verseau)
    const authorizedSteus = await this.masaProvider.findVSteuSclItvByItvRfa(siret);
    const steuCodes = authorizedSteus.map((s) => s.ouvrageDepollutionCode).filter((code) => !!code);

    if (steuCodes.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }

    const result = await this.indicateursRepository.findIndicateursSteu(steuCodes, page, pageSize);

    return {
      ...result,
      page,
      pageSize,
    };
  }
}
