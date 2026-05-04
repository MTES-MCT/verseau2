import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Req,
  Param,
  UseGuards,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { LoggerService } from '@shared/logger/logger.service';
import { XML_EXTENSION, XML_MIME_TYPES } from '@shared/constants/mimeTypes';
import { DeposerUnFichier } from './usecase/deposerUnFichier';
import { DroitsDepotService } from './droitsDepot.service';
import type { CustomRequest } from '@shared/constants/customRequest';
import { DepotService } from './depot.service';
import { UserService } from '@user/user.service';
import type { RouteParams, RouteQuery, RouteResponse } from '@lib/dossier';
import {
  listDepots,
  uploadDepot,
  checkDroitsDeDepot as checkDroitsRoute,
  downloadRapport,
  downloadXml,
} from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';

import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';
import type { Response } from 'express';
import { mapDepotEntityToDepotDto } from './depot.mapper';
import { sanitizeFilename } from '@shared/schema/filename.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { DepotError } from './depotError';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('depot')
export class DepotController {
  constructor(
    private readonly deposerUnFichier: DeposerUnFichier,
    private readonly depotService: DepotService,
    private readonly droitsDepotService: DroitsDepotService,
    private readonly userService: UserService,
    private readonly droitsUserService: DroitsUserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DepotController.name);
  }

  @Post('upload')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: MulterFile | undefined,
    @Req() req: CustomRequest,
  ): Promise<RouteResponse<typeof uploadDepot>> {
    const user = req.user;
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (!originalName || originalName.trim().length === 0) {
      throw new BadRequestException('File must have a valid name');
    }
    const sanitizedName = sanitizeFilename(originalName);

    const isXmlFile =
      file.mimetype === XML_MIME_TYPES.APPLICATION_XML ||
      file.mimetype === XML_MIME_TYPES.TEXT_XML ||
      originalName.toLowerCase().endsWith(XML_EXTENSION);

    if (!isXmlFile) {
      throw new BadRequestException('File must be an XML file');
    }

    const userEntity = await this.userService.findBySub(user.cerbereId);
    const itvCdn = await this.droitsUserService.resolveItvCdn(user.cerbereId);

    if (!itvCdn) {
      throw new ForbiddenException('Aucun intervenant (ITV) lié à votre compte');
    }

    const depot = await this.deposerUnFichier.execute({
      nomOriginalFichier: sanitizedName,
      size: file.size,
      type: file.mimetype,
      buffer: file.buffer,
      itvCdn,
      utilisateur: {
        id: userEntity.id,
        nom: userEntity.nom,
        prenom: userEntity.prenom,
      },
    });

    this.logger.log('Depot created', { depotId: depot.id });

    return depot;
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
      this.logger.warn(`Droits de dépôt refusés pour ${user.mel} : ${errorMessage}`);
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
    res.send(xmlBuffer);
  }
}
