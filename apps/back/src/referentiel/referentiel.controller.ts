import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReferentielService } from './referentiel.service';

@Controller('referentiel')
export class ReferentielController {
  constructor(private readonly referentielService: ReferentielService) {}

  @Get('maitre-ouvrage-ouvrage-depollution')
  async findMaitreOuvrageOuvrageDepollution(
    @Query('cdOuvrageDepollution') cdOuvrageDepollution: string,
    @Query('cdIntervenant') cdIntervenant: string,
  ): Promise<{ itvCdn: string[] }> {
    if (!cdOuvrageDepollution) {
      throw new BadRequestException('cdOuvrageDepollution query parameter is required');
    }
    if (!cdIntervenant) {
      throw new BadRequestException('cdIntervenant query parameter is required');
    }

    const itvCdn = await this.referentielService.findItvBySteuAndIntervenant(cdOuvrageDepollution, cdIntervenant);

    return { itvCdn };
  }
}
