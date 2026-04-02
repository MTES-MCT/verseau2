import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  listEvenementScl as listEvenementSclRoute,
  listEvenementSteu as listEvenementSteuRoute,
  listEvenementTypes as listEvenementTypesRoute,
  listEvenementPmo as listEvenementPmoRoute,
} from '@lib/dossier';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { EvenementService } from './evenement.service';

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
    return this.evenementService.listEvenementSteu({
      authorizedSteuCdas: req.authorizedSteuCdas!,
      ...query,
    });
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
