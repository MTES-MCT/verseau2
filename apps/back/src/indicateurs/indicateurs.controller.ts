import { Controller, Get, Req, UseInterceptors } from '@nestjs/common';
import type { CustomRequest } from '@shared/constants/customRequest';
import { IndicateursService } from './indicateurs.service';
import type { RouteResponse } from '@lib/dossier';
import { getIndicateursSteu } from '@lib/dossier';
import { CerbereIdCacheInterceptor } from '@shared/cerbereIdCache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('indicateurs')
@UseInterceptors(CerbereIdCacheInterceptor)
@CacheTTL(3600000)
export class IndicateursController {
  constructor(private readonly indicateursService: IndicateursService) {}

  @Get('steu')
  async getIndicateursSteu(@Req() req: CustomRequest): Promise<RouteResponse<typeof getIndicateursSteu>> {
    const subId = req.user.cerbereId;
    return await this.indicateursService.getIndicateursSteu(subId);
  }
}
