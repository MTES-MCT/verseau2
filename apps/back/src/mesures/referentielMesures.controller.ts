import { Controller, Get } from '@nestjs/common';
import type { RouteResponse } from '@lib/dossier';
import { listFinalites, listStatuts, listQualifications } from '@lib/dossier';
import { MesuresService } from './mesures.service';

@Controller('mesures')
export class ReferentielMesuresController {
  constructor(private readonly mesuresService: MesuresService) {}

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
