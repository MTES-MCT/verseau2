import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { DepotModel } from './depot.model';
import { DepotService } from './depot.service';
import type { Response } from 'express';
import { IsAdminGuard } from '@authentication/isAdmin.guard';

@UseGuards(IsAdminGuard)
@Controller('admin/depot')
export class DepotAdminController {
  constructor(private readonly depotService: DepotService) {}

  @Get()
  async listAllDepots(): Promise<DepotModel[]> {
    return this.depotService.findAllByAdmin();
  }

  // TODO : utiliser une URL signée pour sécuriser l'accès au rapport pouré éviter le back de faire passe plat
  // TODO: ajouter un guard admin
  @Get(':id/rapport')
  async downloadRapport(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const pdfBuffer = await this.depotService.downloadRapport(id);
    const depot = await this.depotService.findById(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=rapport-${depot.id}.pdf`,
    });

    res.send(pdfBuffer);
  }
}
