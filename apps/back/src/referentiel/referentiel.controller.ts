import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { codesToParametres, listPointsMesureReferentiel } from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { MeGuard } from '@authentication/me.guard';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';
import type { CustomRequest } from '@shared/constants/customRequest';
import { MasaProvider } from '@masa/masa.provider';
import { toLocalisationCodes } from '@masa/toMasa.mapper';
import { ParametreGateway } from './parametre/parametre.gateway';

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
}
