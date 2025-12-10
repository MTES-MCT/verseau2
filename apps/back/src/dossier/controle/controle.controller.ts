import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ControleGateway } from './controle.gateway';
import { ControleDto, ControleSandreDto } from '@lib/dossier';
import { AuthenticationGuard } from '@authentication/authentication.guard';
import { ReponseSandreGateway } from './technique/sandre/reponseSandre.gateway';

@Controller('depot')
export class ControleController {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(ReponseSandreGateway) private readonly reponseSandreGateway: ReponseSandreGateway,
  ) {}

  // TODO: Ajouter le guard HasUserAccessToDepotGuard
  // @UseGuards(AuthenticationGuard, HasUserAccessToDepotGuard)
  @UseGuards(AuthenticationGuard)
  @Get(':depotId/controle')
  async getControle(@Param('depotId') depotId: string): Promise<ControleDto[]> {
    return this.controleGateway.findByDepotId(depotId);
  }

  // TODO: Ajouter le guard HasUserAccessToDepotGuard
  // @UseGuards(AuthenticationGuard, HasUserAccessToDepotGuard)
  @UseGuards(AuthenticationGuard)
  @Get(':depotId/controle/sandre')
  async getControleSandre(@Param('depotId') depotId: string): Promise<ControleSandreDto[]> {
    return this.reponseSandreGateway.findByDepotId(depotId);
  }
}
