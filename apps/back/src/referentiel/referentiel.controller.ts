import { Controller, Get, Query } from '@nestjs/common';
import type { RouteQuery, RouteResponse } from '@lib/dossier';
import { codesToParametres } from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { ParametreGateway } from './parametre/parametre.gateway';

@Controller('referentiel')
export class ReferentielController {
  constructor(private readonly parametreGateway: ParametreGateway) {}

  @Get('codes-to-parametres')
  findParametresByCodes(
    @Query(new ZodValidationPipe(codesToParametres['query'])) query: RouteQuery<typeof codesToParametres>,
  ): RouteResponse<typeof codesToParametres> {
    const parametres = this.parametreGateway.findParametresByCodes(query.codes);

    return { parametres };
  }
}
