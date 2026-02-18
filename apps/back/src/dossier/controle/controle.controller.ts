import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ControleGateway } from './controle.gateway';
import type { RouteParams, RouteResponse } from '@lib/dossier';
import { getControles, getControlesSandre, getMasa } from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { ReponseSandreGateway } from './technique/sandre/reponseSandre.gateway';
import { MasaGateway } from '../masa/masa.gateway';
import { mapMasaModelToDto } from '../masa/masa.mapper';
import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';
import { IsAdminGuard } from '@authentication/isAdmin.guard';
import { UseOrGuards } from '@shared/guards/useOrGuards';

@Controller('depot')
export class ControleController {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(ReponseSandreGateway) private readonly reponseSandreGateway: ReponseSandreGateway,
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
  ) {}

  @UseOrGuards(HasUserAccessToDepotGuard, IsAdminGuard)
  @Get(':depotId/controle')
  async getControle(
    @Param(new ZodValidationPipe(getControles['params'])) { depotId }: RouteParams<typeof getControles>,
  ): Promise<RouteResponse<typeof getControles>> {
    return this.controleGateway.findByDepotId(depotId);
  }

  @UseOrGuards(HasUserAccessToDepotGuard, IsAdminGuard)
  @Get(':depotId/controle/sandre')
  async getControleSandre(
    @Param(new ZodValidationPipe(getControlesSandre['params'])) { depotId }: RouteParams<typeof getControlesSandre>,
  ): Promise<RouteResponse<typeof getControlesSandre>> {
    return this.reponseSandreGateway.findByDepotId(depotId);
  }

  @UseOrGuards(HasUserAccessToDepotGuard, IsAdminGuard)
  @Get(':depotId/masa')
  async getMasa(
    @Param(new ZodValidationPipe(getMasa['params'])) { depotId }: RouteParams<typeof getMasa>,
  ): Promise<RouteResponse<typeof getMasa>> {
    const masa = await this.masaGateway.findByDepotId(depotId);
    return masa ? mapMasaModelToDto(masa) : null;
  }
}
