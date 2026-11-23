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
  async getIndicateursSteu(
    authorizedSteuCdas: string[] | undefined,
    page: number,
    pageSize: number,
  ): Promise<PaginatedIndicateurSteuResponse> {
    if (!authorizedSteuCdas || authorizedSteuCdas.length === 0) {
      this.logger.log(`Aucun STEU autorisé trouvé`);
      return { data: [], total: 0, page, pageSize };
    }

    if (authorizedSteuCdas.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }

    const result = await this.indicateursRepository.findIndicateursSteu(authorizedSteuCdas, page, pageSize);

    return {
      ...result,
      page,
      pageSize,
    };
  }
}
