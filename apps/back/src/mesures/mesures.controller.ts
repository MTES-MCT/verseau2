import { Controller, Get, Query, Req } from '@nestjs/common';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import { IsAdminGuard } from '@authentication/isAdmin.guard';
import { UseOrGuards } from '@shared/guards/useOrGuards';
import type { CustomRequest } from '@shared/constants/customRequest';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { listMesures, listOuvrages, listSystemesCollecte, listPointsMesure, listParametresMesure } from '@lib/dossier';
import { MesuresService } from './mesures.service';

@Controller('mesures')
@UseOrGuards(HasUserAccessToOuvragesGuard, IsAdminGuard)
export class MesuresController {
  constructor(private readonly mesuresService: MesuresService) {}

  @Get()
  async listMesures(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listMesures['query'])) query: RouteQuery<typeof listMesures>,
  ): Promise<RouteResponse<typeof listMesures>> {
    return this.mesuresService.listMesures({
      authorizedSteuCdas: req.authorizedSteuCdas,
      authorizedSclCdas: req.authorizedSclCdas,
      ouvrageType: query.ouvrageType,
      steuSandreCdas: query.steuSandreCdas,
      sclSandreCdas: query.sclSandreCdas,
      pmoCdn: query.pmoCdn,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      parametreCode: query.parametreCode,
      qualification: query.qualification,
      statut: query.statut,
      finalite: query.finalite,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('ouvrages')
  async listOuvrages(@Req() req: CustomRequest): Promise<RouteResponse<typeof listOuvrages>> {
    return this.mesuresService.listOuvrages(req.authorizedSteuCdas);
  }

  @Get('systemes-collecte')
  async listSystemesCollecte(@Req() req: CustomRequest): Promise<RouteResponse<typeof listSystemesCollecte>> {
    return this.mesuresService.listSystemesCollecte(req.authorizedSclCdas);
  }

  @Get('points-mesure')
  async listPointsMesure(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listPointsMesure['query'])) query: RouteQuery<typeof listPointsMesure>,
  ): Promise<RouteResponse<typeof listPointsMesure>> {
    return this.mesuresService.listPointsMesure(
      req.authorizedSteuCdas,
      req.authorizedSclCdas,
      query.ouvrageType,
      query.ouvrageCode,
    );
  }

  @Get('parametres')
  async listParametresMesure(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listParametresMesure['query'])) query: RouteQuery<typeof listParametresMesure>,
  ): Promise<RouteResponse<typeof listParametresMesure>> {
    return this.mesuresService.listParametresMesure(
      req.authorizedSteuCdas,
      req.authorizedSclCdas,
      query.ouvrageType,
      query.ouvrageCode,
      query.pmoCdn,
    );
  }
}
