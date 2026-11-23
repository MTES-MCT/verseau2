import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { IndicateursService } from './indicateurs.service';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { getIndicateursSteu } from '@lib/dossier';
import { CerbereIdCacheInterceptor } from '@shared/cerbereIdCache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';

@Controller('indicateurs')
@UseGuards(MeGuard, HasUserAccessToOuvragesGuard)
@UseInterceptors(CerbereIdCacheInterceptor)
@CacheTTL(3600000)
export class IndicateursController {
  constructor(private readonly indicateursService: IndicateursService) {}

  @Get('steu')
  async getIndicateursSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(getIndicateursSteu['query'])) query: RouteQuery<typeof getIndicateursSteu>,
  ): Promise<RouteResponse<typeof getIndicateursSteu>> {
    return await this.indicateursService.getIndicateursSteu(req.authorizedSteuCdas, query.page, query.pageSize);
  }
}
