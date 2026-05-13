import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { IntervenantDetailDto, RouteParams, RouteQuery, RouteResponse } from '@lib/dossier';
import { codesToParametres, getSclDetail, getSteuDetail, listPointsMesureReferentiel } from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { MeGuard } from '@authentication/me.guard';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { MasaProvider } from '@masa/masa.provider';
import { toLocalisationCodes } from '@masa/toMasa.mapper';
import { ParametreGateway } from './parametre/parametre.gateway';
import { toSclDetailResponse, toSteuDetailResponse } from './referentiel.mapper';

@Controller('referentiel')
export class ReferentielController {
  constructor(
    private readonly parametreGateway: ParametreGateway,
    private readonly masaProvider: MasaProvider,
  ) {}

  @Get('codes-to-parametres')
  findParametresByCodes(
    @Query(new ZodValidationPipe(codesToParametres['query'])) query: RouteQuery<typeof codesToParametres>,
  ): RouteResponse<typeof codesToParametres> {
    const parametres = this.parametreGateway.findParametresByCodes(query.codes);

    return { parametres };
  }

  @Get('points-mesure')
  @UseGuards(MeGuard, HasUserAccessToOuvragesGuard)
  async listPointsMesureReferentiel(
    @Req() req: CustomRequest,
    @Query(new ZodValidationPipe(listPointsMesureReferentiel['query']))
    query: RouteQuery<typeof listPointsMesureReferentiel>,
  ): Promise<RouteResponse<typeof listPointsMesureReferentiel>> {
    const { ouvrageType, ouvrageCode, dateDebut, dateFin, typePoint } = query;

    if (ouvrageType === 'scl') {
      if (!req.authorizedSclCdas?.includes(ouvrageCode)) {
        throw new ForbiddenException('User is not authorized to access this ouvrage');
      }
    } else {
      if (!req.authorizedSteuCdas?.includes(ouvrageCode)) {
        throw new ForbiddenException('User is not authorized to access this ouvrage');
      }
    }

    const localisationCodes = toLocalisationCodes(typePoint);

    const points = await this.masaProvider.findPointsMesureReferentiel(ouvrageType, ouvrageCode, {
      dateDebut,
      dateFin,
      localisationCodes,
    });

    return { points };
  }

  @Get('steu/:ouvrageDepollutionCode/detail')
  @UseGuards(MeGuard, HasUserAccessToOuvragesGuard)
  async getBilanSteuDetail(
    @Req() req: CustomRequest,
    @Param(new ZodValidationPipe(getSteuDetail['params']))
    params: RouteParams<typeof getSteuDetail>,
  ): Promise<RouteResponse<typeof getSteuDetail>> {
    if (!req.authorizedSteuCdas?.includes(params.ouvrageDepollutionCode)) {
      return null;
    }

    const detail = await this.masaProvider.findBilanSteuDetail(params.ouvrageDepollutionCode);
    if (!detail) {
      return null;
    }

    return toSteuDetailResponse(detail);
  }

  @Get('scl/:systemeCollecteCode/detail')
  @UseGuards(MeGuard, HasUserAccessToOuvragesGuard)
  async getBilanSclDetail(
    @Req() req: CustomRequest,
    @Param(new ZodValidationPipe(getSclDetail['params']))
    params: RouteParams<typeof getSclDetail>,
  ): Promise<RouteResponse<typeof getSclDetail>> {
    if (!req.authorizedSclCdas?.includes(params.systemeCollecteCode)) {
      return null;
    }

    const detail = await this.masaProvider.findBilanSclDetail(params.systemeCollecteCode);
    if (!detail) {
      return null;
    }

    return toSclDetailResponse(detail);
  }
}
