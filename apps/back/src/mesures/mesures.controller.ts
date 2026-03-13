import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import {
  listMesures,
  listOuvrages,
  listSystemesCollecte,
  listPointsMesure,
  listParametresMesure,
  listFinalites,
  listStatuts,
  listQualifications,
} from '@lib/dossier';
import { MesuresService } from './mesures.service';

@Controller('mesures')
@UseGuards(MeGuard)
export class MesuresController {
  constructor(private readonly mesuresService: MesuresService) {}

  @Get()
  async listMesures(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listMesures['query'])) query: RouteQuery<typeof listMesures>,
  ): Promise<RouteResponse<typeof listMesures>> {
    const itvCdn = req.user.itvCdn;
    return this.mesuresService.listMesures({
      itvCdn,
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
    return this.mesuresService.listOuvrages(req.user.itvCdn);
  }

  @Get('systemes-collecte')
  async listSystemesCollecte(@Req() req: CustomRequest): Promise<RouteResponse<typeof listSystemesCollecte>> {
    return this.mesuresService.listSystemesCollecte(req.user.itvCdn);
  }

  @Get('points-mesure')
  async listPointsMesure(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listPointsMesure['query'])) query: RouteQuery<typeof listPointsMesure>,
  ): Promise<RouteResponse<typeof listPointsMesure>> {
    return this.mesuresService.listPointsMesure(req.user.itvCdn, query.ouvrageType, query.ouvrageCode);
  }

  @Get('parametres')
  async listParametresMesure(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listParametresMesure['query'])) query: RouteQuery<typeof listParametresMesure>,
  ): Promise<RouteResponse<typeof listParametresMesure>> {
    return this.mesuresService.listParametresMesure(
      req.user.itvCdn,
      query.ouvrageType,
      query.ouvrageCode,
      query.pmoCdn,
    );
  }

  @Get('finalites')
  async listFinalites(): Promise<RouteResponse<typeof listFinalites>> {
    return this.mesuresService.listFinalites();
  }

  @Get('statuts')
  async listStatuts(): Promise<RouteResponse<typeof listStatuts>> {
    return this.mesuresService.listStatuts();
  }

  @Get('qualifications')
  async listQualifications(): Promise<RouteResponse<typeof listQualifications>> {
    return this.mesuresService.listQualifications();
  }
}
