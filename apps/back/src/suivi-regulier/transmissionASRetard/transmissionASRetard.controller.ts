import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  listTransmissionASRetardScl as listSclRoute,
  listTransmissionASRetardSteu as listSteuRoute,
} from '@lib/dossier';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
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
}
