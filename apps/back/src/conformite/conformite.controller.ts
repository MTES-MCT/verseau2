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
import {
  toConformiteSclDetailDto,
  toPaginatedConformiteSclResponse,
  toPaginatedConformiteSteuResponse,
  toConformiteSteuDetailDto,
} from './conformite.mapper';
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
    const response = await this.conformiteService.listConformiteSteu({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      year: query.year,
      ouvrageDepollutionCode: query.ouvrageDepollutionCode,
      trancheObligationRfa: query.trancheObligationRfa, // TODO : remove trancheObligationRfa ?
      impact: query.impact,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return toPaginatedConformiteSteuResponse(response);
  }

  @Get('scl')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listConformiteScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listConformiteSclRoute['query'])) query: RouteQuery<typeof listConformiteSclRoute>,
  ): Promise<RouteResponse<typeof listConformiteSclRoute>> {
    const response = await this.conformiteService.listConformiteScl({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      year: query.year,
      systemeCollecteCode: query.systemeCollecteCode,
      trancheObligationRfa: query.trancheObligationRfa, // TODO : remove trancheObligationRfa ?
      impact: query.impact,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return toPaginatedConformiteSclResponse(response);
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
    const detail = await this.conformiteService.getConformiteSteuDetail(
      params.steuCdn,
      query.year,
      req.authorizedSteuCdas!,
    );

    return detail ? toConformiteSteuDetailDto(detail) : null;
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
    const detail = await this.conformiteService.getConformiteSclDetail(
      params.sclCdn,
      query.year,
      req.authorizedSclCdas!,
    );

    return detail ? toConformiteSclDetailDto(detail) : null;
  }
}
