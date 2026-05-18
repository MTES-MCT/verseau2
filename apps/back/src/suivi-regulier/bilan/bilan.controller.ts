import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  exportBilanScl as exportBilanSclRoute,
  exportBilanSteu as exportBilanSteuRoute,
  listBilanScl as listBilanSclRoute,
  listBilanSteu as listBilanSteuRoute,
} from '@lib/dossier';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { sendCsvResponse } from '@shared/csv/csvResponse';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { Response } from 'express';
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

  @Get('steu/export')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async exportBilanSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(exportBilanSteuRoute['query']))
    query: RouteQuery<typeof exportBilanSteuRoute>,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.bilanService.exportBilanSteuCsv({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
    });

    sendCsvResponse(res, `bilan-steu-${query.year}.csv`, csv);
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

  @Get('scl/export')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async exportBilanScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(exportBilanSclRoute['query']))
    query: RouteQuery<typeof exportBilanSclRoute>,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.bilanService.exportBilanSclCsv({
      authorizedSclCdas: req.authorizedSclCdas!,
      ...query,
    });

    sendCsvResponse(res, `bilan-scl-${query.year}.csv`, csv);
  }
}
