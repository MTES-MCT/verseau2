import { Body, Controller, Get, Post, Query, Req, Param, UseGuards, Res, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoggerService } from '@shared/logger/logger.service';
import { DepotUploadService } from './depotUpload.service';
import { DroitsDepotService } from './droitsDepot.service';
import type { CustomRequest } from '@shared/constants/customRequest';
import { DepotService } from './depot.service';
import { UserService } from '@user/user.service';
import type { RouteBody, RouteParams, RouteQuery, RouteResponse } from '@lib/dossier';
import {
  listDepots,
  initializeDepotUpload,
  completeDepotUpload,
  checkDroitsDeDepot as checkDroitsRoute,
  downloadRapport,
  downloadXml,
} from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';

import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';
import { MeGuard } from '@authentication/me.guard';
import type { Response } from 'express';
import { mapDepotEntityToDepotDto } from './depot.mapper';
import { DroitsUserService } from '@user/droitsUser.service';
import { DepotError } from './depotError';

@Controller('depot')
export class DepotController {
  constructor(
    private readonly depotUploadService: DepotUploadService,
    private readonly depotService: DepotService,
    private readonly droitsDepotService: DroitsDepotService,
    private readonly userService: UserService,
    private readonly droitsUserService: DroitsUserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DepotController.name);
  }

  @Post('upload/init')
  @UseGuards(MeGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async initializeUpload(
    @Body(new ZodValidationPipe(initializeDepotUpload.body)) body: RouteBody<typeof initializeDepotUpload>,
    @Req() req: CustomRequest,
  ): Promise<RouteResponse<typeof initializeDepotUpload>> {
    const user = req.user;
    const userEntity = await this.userService.findBySub(user.cerbereId);
    const itvCdn = await this.droitsUserService.resolveItvCdn(user.cerbereId);

    if (!itvCdn) {
      throw new ForbiddenException('Aucun intervenant (ITV) lié à votre compte');
    }

    return this.depotUploadService.initialize(
      body,
      {
        id: userEntity.id,
        nom: userEntity.nom,
        prenom: userEntity.prenom,
      },
      itvCdn,
    );
  }

  @Post(':id/upload/complete')
  @UseGuards(MeGuard)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  async completeUpload(
    @Param(new ZodValidationPipe(completeDepotUpload.params)) { id }: RouteParams<typeof completeDepotUpload>,
    @Req() req: CustomRequest,
  ): Promise<RouteResponse<typeof completeDepotUpload>> {
    const user = await this.userService.findBySub(req.user.cerbereId);
    const depot = await this.depotUploadService.complete(id, { id: user.id, nom: user.nom, prenom: user.prenom });
    return mapDepotEntityToDepotDto(depot);
  }

  @Get()
  async listMyDepots(@Req() req: CustomRequest): Promise<RouteResponse<typeof listDepots>> {
    const user = req.user;
    const itvCdn = await this.droitsUserService.resolveItvCdn(user.cerbereId);
    if (!itvCdn) {
      return [];
    }
    const depots = await this.depotService.findByItvCdn(itvCdn);
    return depots.map((depot) => mapDepotEntityToDepotDto(depot));
  }

  @Get('droits-de-depot')
  async checkDroitsDeDepot(
    @Query(new ZodValidationPipe(checkDroitsRoute['query']))
    query: RouteQuery<typeof checkDroitsRoute>,
    @Req() req: CustomRequest,
  ): Promise<RouteResponse<typeof checkDroitsRoute>> {
    const user = req.user;
    const cdOuvrageDepollutionList = query.cdOuvrageDepollution ? query.cdOuvrageDepollution.split(',') : [];
    const cdSystemeCollecteList = query.cdSystemeCollecte ? query.cdSystemeCollecte.split(',') : [];
    const isFluxQualifie = query.isFluxQualifie === 'true';
    try {
      await this.droitsDepotService.validateDroits(
        user.cerbereId,
        cdOuvrageDepollutionList,
        cdSystemeCollecteList,
        isFluxQualifie,
      );
      return { authorized: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Droits de dépôt refusés pour ${user.uid} : ${errorMessage}`);
      return {
        authorized: false,
        errorCode:
          errorMessage === (DepotError.FLUX_QUALIFIE_INTERDIT as string)
            ? DepotError.FLUX_QUALIFIE_INTERDIT
            : DepotError.DROITS_INSUFFISANTS,
      };
    }
  }

  // TODO : utiliser une URL signée pour sécuriser l'accès au rapport pouré éviter le back de faire passe plat
  @Get(':id/rapport')
  @UseGuards(HasUserAccessToDepotGuard)
  async downloadRapportFile(
    @Param(new ZodValidationPipe(downloadRapport['params'])) { id }: RouteParams<typeof downloadRapport>,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.depotService.downloadRapport(id);
    const depot = await this.depotService.findById(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=rapport-${depot.id}.pdf`,
      'Cache-Control': 'private, no-store',
    });

    res.send(pdfBuffer);
  }

  @Get(':id/xml')
  @UseGuards(HasUserAccessToDepotGuard)
  async downloadXmlFile(
    @Param(new ZodValidationPipe(downloadXml['params'])) { id }: RouteParams<typeof downloadXml>,
    @Res() res: Response,
  ): Promise<void> {
    const xmlBuffer = await this.depotService.downloadXml(id);
    const depot = await this.depotService.findById(id);

    res.attachment(depot.nomOriginalFichier);
    res.type('application/xml');
    res.set('Cache-Control', 'private, no-store');
    res.send(xmlBuffer);
  }
}
