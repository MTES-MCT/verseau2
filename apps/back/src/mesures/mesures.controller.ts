import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { MeGuard } from '@authentication/me.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { listMesures, listOuvrages } from '@lib/dossier';
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
      steuSandreCdas: query.steuSandreCdas,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      parametreCode: query.parametreCode,
      qualification: query.qualification,
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
}
