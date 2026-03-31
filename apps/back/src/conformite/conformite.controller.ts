import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { RouteQuery, RouteResponse, RouteParams } from '@lib/dossier';
import { listConformiteSteu, listConformiteScl, getConformiteSteuDetail, getConformiteSclDetail } from '@lib/dossier';
import { ConformiteService } from './conformite.service';

@Controller('conformite')
@UseGuards(MeGuard)
export class ConformiteController {
  constructor(private readonly conformiteService: ConformiteService) {}

  @Get('steu')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listConformiteSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listConformiteSteu['query'])) query: RouteQuery<typeof listConformiteSteu>,
  ): Promise<RouteResponse<typeof listConformiteSteu>> {
    return this.conformiteService.listConformiteSteu(req.authorizedSteuCdas!, query);
  }

  @Get('scl')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listConformiteScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listConformiteScl['query'])) query: RouteQuery<typeof listConformiteScl>,
  ): Promise<RouteResponse<typeof listConformiteScl>> {
    return this.conformiteService.listConformiteScl(req.authorizedSteuCdas!, query);
  }

  @Get('steu/:steuCdn/detail')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async getConformiteSteuDetail(
    @Req() req: CustomRequest,
    @Param(new ZodValidationPipe(getConformiteSteuDetail['params']))
    params: RouteParams<typeof getConformiteSteuDetail>,
  ): Promise<RouteResponse<typeof getConformiteSteuDetail>> {
    const detail = await this.conformiteService.getConformiteSteuDetail(params.steuCdn, req.authorizedSteuCdas!);
    if (!detail) {
      throw new Error('NotFound');
    }
    return detail;
  }

  @Get('scl/:sclCdn/detail')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async getConformiteSclDetail(
    @Req() req: CustomRequest,
    @Param(new ZodValidationPipe(getConformiteSclDetail['params'])) params: RouteParams<typeof getConformiteSclDetail>,
  ): Promise<RouteResponse<typeof getConformiteSclDetail>> {
    const detail = await this.conformiteService.getConformiteSclDetail(params.sclCdn, req.authorizedSteuCdas!);
    if (!detail) {
      throw new Error('NotFound');
    }
    return detail;
  }
}
