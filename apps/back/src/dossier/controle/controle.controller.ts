import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ControleGateway } from './controle.gateway';
import { ControleDto, ControleSandreDto, MasaDto } from '@lib/dossier';
import { ReponseSandreGateway } from './technique/sandre/reponseSandre.gateway';
import { MasaGateway } from '../masa/masa.gateway';
import { mapMasaModelToDto } from '../masa/masa.mapper';
import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';

@Controller('depot')
export class ControleController {
  constructor(
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(ReponseSandreGateway) private readonly reponseSandreGateway: ReponseSandreGateway,
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
  ) {}

  @UseGuards(HasUserAccessToDepotGuard)
  @Get(':depotId/controle')
  async getControle(@Param('depotId') depotId: string): Promise<ControleDto[]> {
    return this.controleGateway.findByDepotId(depotId);
  }

  @UseGuards(HasUserAccessToDepotGuard)
  @Get(':depotId/controle/sandre')
  async getControleSandre(@Param('depotId') depotId: string): Promise<ControleSandreDto[]> {
    return this.reponseSandreGateway.findByDepotId(depotId);
  }

  @UseGuards(HasUserAccessToDepotGuard)
  @Get(':depotId/masa')
  async getMasa(@Param('depotId') depotId: string): Promise<MasaDto | null> {
    const masa = await this.masaGateway.findByDepotId(depotId);
    return masa ? mapMasaModelToDto(masa) : null;
  }
}
