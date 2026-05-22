import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  exportEvenementScl as exportEvenementSclRoute,
  exportEvenementSteu as exportEvenementSteuRoute,
  listEvenementScl as listEvenementSclRoute,
  listEvenementSteu as listEvenementSteuRoute,
  listEvenementTypes as listEvenementTypesRoute,
  listEvenementPmo as listEvenementPmoRoute,
} from '@lib/dossier';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { sendCsvResponse } from '@shared/csv/csvResponse';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { Response } from 'express';
import { EvenementService } from './evenement.service';
import { getStartOfYearAsUTCDate } from '@lib/shared';

@Controller('suivi-regulier/evenement')
@UseGuards(MeGuard)
export class EvenementController {
  constructor(private readonly evenementService: EvenementService) {}

  @Get('steu')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listEvenementSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listEvenementSteuRoute['query']))
    query: RouteQuery<typeof listEvenementSteuRoute>,
  ): Promise<RouteResponse<typeof listEvenementSteuRoute>> {
    const startDate = getStartOfYearAsUTCDate(query.year);
    const endDate = getStartOfYearAsUTCDate(query.year + 1);
    return this.evenementService.listEvenementSteu({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
      startDate,
      endDate,
    });
  }

  @Get('steu/export')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async exportEvenementSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(exportEvenementSteuRoute['query']))
    query: RouteQuery<typeof exportEvenementSteuRoute>,
    @Res() res: Response,
  ): Promise<void> {
    const startDate = getStartOfYearAsUTCDate(query.year);
    const endDate = getStartOfYearAsUTCDate(query.year + 1);
    const csv = await this.evenementService.exportEvenementSteuCsv({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
      startDate,
      endDate,
    });

    sendCsvResponse(res, `evenement-steu-${query.year}.csv`, csv);
  }

  @Get('scl')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listEvenementScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listEvenementSclRoute['query']))
    query: RouteQuery<typeof listEvenementSclRoute>,
  ): Promise<RouteResponse<typeof listEvenementSclRoute>> {
    return this.evenementService.listEvenementScl({
      authorizedSclCdas: req.authorizedSclCdas!,
      ...query,
    });
  }

  @Get('scl/export')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async exportEvenementScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(exportEvenementSclRoute['query']))
    query: RouteQuery<typeof exportEvenementSclRoute>,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.evenementService.exportEvenementSclCsv({
      authorizedSclCdas: req.authorizedSclCdas!,
      ...query,
    });

    sendCsvResponse(res, `evenement-scl-${query.year}.csv`, csv);
  }

  @Get('types')
  async listEvenementTypes(): Promise<RouteResponse<typeof listEvenementTypesRoute>> {
    return this.evenementService.listEvenementTypes();
  }

  @Get('pmo')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listEvenementPmo(@Req() req: CustomRequest): Promise<RouteResponse<typeof listEvenementPmoRoute>> {
    return this.evenementService.listAvailablePointsMesure(req.authorizedSclCdas ?? []);
  }
}
