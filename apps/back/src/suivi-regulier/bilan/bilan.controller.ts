import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  listBilanScl as listBilanSclRoute,
  listBilanSteu as listBilanSteuRoute,
} from '@lib/dossier';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { BilanService } from './bilan.service';

@Controller('suivi-regulier/bilan')
@UseGuards(MeGuard)
export class BilanController {
  constructor(private readonly bilanService: BilanService) {}

  @Get('steu')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listBilanSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listBilanSteuRoute['query']))
    query: RouteQuery<typeof listBilanSteuRoute>,
  ): Promise<RouteResponse<typeof listBilanSteuRoute>> {
    return this.bilanService.listBilanSteu({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
    });
  }

  @Get('scl')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listBilanScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listBilanSclRoute['query']))
    query: RouteQuery<typeof listBilanSclRoute>,
  ): Promise<RouteResponse<typeof listBilanSclRoute>> {
    return this.bilanService.listBilanScl({
      authorizedSclCdas: req.authorizedSclCdas!,
      ...query,
    });
  }
}
