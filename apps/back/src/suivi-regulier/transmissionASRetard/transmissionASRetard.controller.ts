import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  exportTransmissionASRetardScl as exportSclRoute,
  exportTransmissionASRetardSteu as exportSteuRoute,
  listTransmissionASRetardScl as listSclRoute,
  listTransmissionASRetardSteu as listSteuRoute,
} from '@lib/dossier';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { sendCsvResponse } from '@shared/csv/csvResponse';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { Response } from 'express';
import { TransmissionASRetardService } from './transmissionASRetard.service';

@Controller('suivi-regulier/transmission-as-retard')
@UseGuards(MeGuard)
export class TransmissionASRetardController {
  constructor(private readonly transmissionASRetardService: TransmissionASRetardService) {}

  @Get('steu')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listTransmissionASRetardSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listSteuRoute['query']))
    query: RouteQuery<typeof listSteuRoute>,
  ): Promise<RouteResponse<typeof listSteuRoute>> {
    return this.transmissionASRetardService.listTransmissionASRetardSteu({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
    });
  }

  @Get('steu/export')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async exportTransmissionASRetardSteu(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(exportSteuRoute['query']))
    query: RouteQuery<typeof exportSteuRoute>,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.transmissionASRetardService.exportTransmissionASRetardSteuCsv({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
    });

    sendCsvResponse(res, `transmission-as-retard-steu-${query.year}.csv`, csv);
  }

  @Get('scl')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async listTransmissionASRetardScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listSclRoute['query']))
    query: RouteQuery<typeof listSclRoute>,
  ): Promise<RouteResponse<typeof listSclRoute>> {
    return this.transmissionASRetardService.listTransmissionASRetardScl({
      authorizedSclCdas: req.authorizedSclCdas!,
      ...query,
    });
  }

  @Get('scl/export')
  @UseGuards(HasUserAccessToOuvragesGuard)
  async exportTransmissionASRetardScl(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(exportSclRoute['query']))
    query: RouteQuery<typeof exportSclRoute>,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.transmissionASRetardService.exportTransmissionASRetardSclCsv({
      authorizedSclCdas: req.authorizedSclCdas!,
      ...query,
    });

    sendCsvResponse(res, `transmission-as-retard-scl-${query.year}.csv`, csv);
  }
}
