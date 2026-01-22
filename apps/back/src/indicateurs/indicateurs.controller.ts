import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { IndicateursService } from './indicateurs.service';
import { IndicateurSteuDto } from '@lib/dossier';

@Controller('indicateurs')
@UseGuards(MeGuard)
export class IndicateursController {
  constructor(private readonly indicateursService: IndicateursService) {}

  @Get('steu')
  async getIndicateursSteu(@Req() req: CustomRequest): Promise<IndicateurSteuDto[]> {
    return this.indicateursService.getIndicateursSteu(req.user.cerbereId);
  }
}
