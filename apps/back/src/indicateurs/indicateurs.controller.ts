import { Controller, Get, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { IndicateursService } from './indicateurs.service';
import { IndicateurSteuDto } from '@lib/dossier';
import { CerbereIdCacheInterceptor } from '@shared/cerbereIdCache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('indicateurs')
@UseGuards(MeGuard)
@UseInterceptors(CerbereIdCacheInterceptor)
@CacheTTL(3600000)
export class IndicateursController {
  constructor(private readonly indicateursService: IndicateursService) {}

  @Get('steu')
  async getIndicateursSteu(@Req() req: CustomRequest): Promise<IndicateurSteuDto[]> {
    const subId = req.user.cerbereId;
    return await this.indicateursService.getIndicateursSteu(subId);
  }
}
