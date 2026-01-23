import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { IndicateursService } from './indicateurs.service';
import { IndicateurSteuDto } from '@lib/dossier';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { LoggerService } from '@shared/logger/logger.service';

@Controller('indicateurs')
@UseGuards(MeGuard)
export class IndicateursController {
  constructor(
    private readonly indicateursService: IndicateursService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.setContext(IndicateursController.name);
  }

  // TODO : ajouter un HTTPInterceptor pour gérer le cache par utilisateur: req.user.cerbereId : class HttpCacheInterceptor extends CacheInterceptor
  @Get('steu')
  async getIndicateursSteu(@Req() req: CustomRequest): Promise<IndicateurSteuDto[]> {
    const CACHE_KEY_PREFIX = 'indicateurs:steu';
    const subId = req.user.cerbereId;
    const cacheKey = `${CACHE_KEY_PREFIX}:${subId}`;
    const indicateursSteuCached = await this.cacheManager.get<IndicateurSteuDto[]>(cacheKey);
    if (indicateursSteuCached !== undefined) {
      this.logger.debug(`Cache hit for indicateurs steu: ${subId}`);
      return indicateursSteuCached;
    } else {
      const indicateursSteu = await this.indicateursService.getIndicateursSteu(subId);
      await this.cacheManager.set(cacheKey, indicateursSteu, 3600000);
      return indicateursSteu;
    }
  }
}
