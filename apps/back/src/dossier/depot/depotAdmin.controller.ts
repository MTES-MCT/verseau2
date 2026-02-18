import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { DepotService } from './depot.service';
import type { Response } from 'express';
import { IsAdminGuard } from '@authentication/isAdmin.guard';
import type { RouteParams, RouteResponse } from '@lib/dossier';
import { listAllDepots, downloadAdminRapport, downloadAdminXml } from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { mapDepotEntityToDepotDto } from './depot.mapper';

@UseGuards(IsAdminGuard)
@Controller('admin/depot')
export class DepotAdminController {
  constructor(private readonly depotService: DepotService) {}

  @Get()
  async listDepots(): Promise<RouteResponse<typeof listAllDepots>> {
    const depots = await this.depotService.findAllByAdmin();
    return depots.map((depot) => mapDepotEntityToDepotDto(depot));
  }

  // TODO : utiliser une URL signée pour sécuriser l'accès au rapport pouré éviter le back de faire passe plat
  @Get(':id/rapport')
  async downloadRapportFile(
    @Param(new ZodValidationPipe(downloadAdminRapport['params'])) { id }: RouteParams<typeof downloadAdminRapport>,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.depotService.downloadRapport(id);
    const depot = await this.depotService.findById(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=rapport-${depot.id}.pdf`,
    });

    res.send(pdfBuffer);
  }

  @Get(':id/xml')
  async downloadXmlFile(
    @Param(new ZodValidationPipe(downloadAdminXml['params'])) { id }: RouteParams<typeof downloadAdminXml>,
    @Res() res: Response,
  ): Promise<void> {
    const xmlBuffer = await this.depotService.downloadXml(id);
    const depot = await this.depotService.findById(id);

    res.attachment(depot.nomOriginalFichier);
    res.type('application/xml');
    res.send(xmlBuffer);
  }
}
