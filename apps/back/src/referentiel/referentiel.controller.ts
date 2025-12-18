import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReferentielService } from './referentiel.service';
import { AuthenticationGuard } from '@authentication/authentication.guard';
import { ParametreGateway } from './parametre/parametre.gateway';
import { CodeParametre } from './parametre/codeParametre';
// import { AuthenticatedUserDecorator } from '@authentication/authenticated-user.decorator';
// import type { AuthenticatedUser } from '@authentication/authentication';

@Controller('referentiel')
@UseGuards(AuthenticationGuard)
export class ReferentielController {
  constructor(
    private readonly referentielService: ReferentielService,
    private readonly parametreGateway: ParametreGateway,
  ) {}

  //TODO: Ajouter Guard
  @Get('maitre-ouvrage-ouvrage-depollution')
  async findMaitreOuvrageOuvrageDepollution(
    @Query('cdOuvrageDepollution') cdOuvrageDepollution: string,
    @Query('cdIntervenant') cdIntervenant: string,
    // @AuthenticatedUserDecorator() user: AuthenticatedUser,
  ): Promise<{ itvCdn: string[] }> {
    if (!cdOuvrageDepollution) {
      throw new BadRequestException('cdOuvrageDepollution query parameter is required');
    }
    if (!cdIntervenant) {
      throw new BadRequestException('cdIntervenant query parameter is required');
    }

    // TODO : Utiliser le user connecté pour récupérer son cdIntervenant
    const itvCdn = await this.referentielService.findItvBySteuAndIntervenant(cdOuvrageDepollution, cdIntervenant);

    return { itvCdn };
  }

  //TODO: Ajouter Guard
  @Get('parametre-to-code')
  findCodeParametreById(@Query('id') id: keyof typeof CodeParametre): { code: number | null } {
    if (!id) {
      throw new BadRequestException('id query parameter is required');
    }

    const code = this.parametreGateway.findCodeParametreById(id);

    return { code };
  }

  //TODO: Ajouter Guard
  @Get('parametres-to-codes')
  findCodesByParametres(@Query('parametres') parametres: string | string[]): { codes: (number | null)[] } {
    if (!parametres) {
      throw new BadRequestException('parametres query parameter is required');
    }

    const parametreList = Array.isArray(parametres) ? parametres : [parametres];
    const codes = this.parametreGateway.findCodesByParametres(parametreList);

    return { codes };
  }

  //TODO: Ajouter Guard
  @Get('codes-to-parametres')
  findParametresByCodes(@Query('codes') codes: string | string[]): { parametres: (string | null)[] } {
    if (!codes) {
      throw new BadRequestException('codes query parameter is required');
    }

    const parametres = this.parametreGateway.findParametresByCodes(codes);

    return { parametres };
  }
}
