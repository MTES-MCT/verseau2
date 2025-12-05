import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ControleGateway } from './controle.gateway';
import { ControleDto } from '@lib/dossier';
import { AuthenticationGuard } from '@authentication/authentication.guard';
import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';

@Controller('depot')
export class ControleController {
  constructor(@Inject(ControleGateway) private readonly controleGateway: ControleGateway) {}

  @UseGuards(AuthenticationGuard, HasUserAccessToDepotGuard)
  @Get(':depotId/controle')
  async getControle(@Param('depotId') depotId: string): Promise<ControleDto[]> {
    return this.controleGateway.findByDepotId(depotId);
  }
}
