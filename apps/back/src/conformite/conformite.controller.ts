import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  getConformiteSclDetail as getConformiteSclDetailRoute,
  getConformiteSteuDetail as getConformiteSteuDetailRoute,
  listConformiteScl as listConformiteSclRoute,
  listConformiteSteu as listConformiteSteuRoute,
} from '@lib/dossier';
import type { RouteParams, RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { ConformiteService } from './conformite.service';

@Controller('conformite')
@UseGuards(MeGuard)
export class ConformiteController {
  constructor(private readonly conformiteService: ConformiteService) {}

  @Get('steu')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listConformiteSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listConformiteSteuRoute['query'])) query: RouteQuery<typeof listConformiteSteuRoute>,
  ): Promise<RouteResponse<typeof listConformiteSteuRoute>> {
    return this.conformiteService.listConformiteSteu({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      year: query.year,
      trancheObligationLibelle: query.trancheObligationLibelle,
      impact: query.impact,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('scl')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listConformiteScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listConformiteSclRoute['query'])) query: RouteQuery<typeof listConformiteSclRoute>,
  ): Promise<RouteResponse<typeof listConformiteSclRoute>> {
    return this.conformiteService.listConformiteScl({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      year: query.year,
      trancheObligationLibelle: query.trancheObligationLibelle,
      impact: query.impact,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('steu/:steuCdn/detail')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async getConformiteSteuDetail(
    @Req() req: CustomRequest,
    @Param(new ZodValidationPipe(getConformiteSteuDetailRoute['params']))
    params: RouteParams<typeof getConformiteSteuDetailRoute>,
    @Query(new ZodValidationPipe(getConformiteSteuDetailRoute['query']))
    query: RouteQuery<typeof getConformiteSteuDetailRoute>,
  ): Promise<RouteResponse<typeof getConformiteSteuDetailRoute>> {
    return this.conformiteService.getConformiteSteuDetail(params.steuCdn, query.year, req.authorizedSteuCdas!);
  }

  @Get('scl/:sclCdn/detail')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async getConformiteSclDetail(
    @Req() req: CustomRequest,
    @Param(new ZodValidationPipe(getConformiteSclDetailRoute['params']))
    params: RouteParams<typeof getConformiteSclDetailRoute>,
    @Query(new ZodValidationPipe(getConformiteSclDetailRoute['query']))
    query: RouteQuery<typeof getConformiteSclDetailRoute>,
  ): Promise<RouteResponse<typeof getConformiteSclDetailRoute>> {
    return this.conformiteService.getConformiteSclDetail(params.sclCdn, query.year, req.authorizedSclCdas!);
  }
}
