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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { LoggerService } from '@shared/logger/logger.service';
import { XML_EXTENSION, XML_MIME_TYPES } from '@shared/constants/mimeTypes';
import { DeposerUnFichier } from './usecase/deposerUnFichier';
import type { CustomRequest } from '@shared/constants/customRequest';
import { DepotService } from './depot.service';
import { UserService } from '@user/user.service';
import { DepotDto } from '@lib/dossier';
import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';
import type { Response } from 'express';
import { mapDepotEntityToDepotDto } from './depot.mapper';
import { sanitizeFilename } from '@shared/schema/filename.service';

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
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DepotController.name);
  }

  @Post('upload')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: MulterFile | undefined, @Req() req: CustomRequest): Promise<DepotDto> {
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

    const depot = await this.deposerUnFichier.execute({
      nomOriginalFichier: sanitizedName,
      size: file.size,
      type: file.mimetype,
      buffer: file.buffer,
      utilisateur: {
        id: userEntity.id,
        nom: user.nom,
        prenom: user.prenom,
      },
    });

    this.logger.log('Depot created', { depotId: depot.id });

    return depot;
  }

  @Get()
  async listMyDepots(@Req() req: CustomRequest): Promise<DepotDto[]> {
    const user = req.user;
    const userEntity = await this.userService.findBySub(user.cerbereId);
    const depots = await this.depotService.findByUserId(userEntity.id);
    return depots.map((depot) => mapDepotEntityToDepotDto(depot));
  }

  @Get('droits-de-depot')
  async checkDroitsDeDepot(
    @Query('cdOuvrage') cdOuvrage: string,
    @Req() req: CustomRequest,
  ): Promise<{ authorized: boolean }> {
    const user = req.user;
    const userEntity = await this.userService.findBySub(user.cerbereId);
    const authorized = await this.depotService.checkDroitsDeDepot(cdOuvrage, userEntity.itvCdn);
    return { authorized };
  }

  // TODO : utiliser une URL signée pour sécuriser l'accès au rapport pouré éviter le back de faire passe plat
  @Get(':id/rapport')
  @UseGuards(HasUserAccessToDepotGuard)
  async downloadRapport(@Param('id') id: string, @Res() res: Response): Promise<void> {
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
  async downloadXml(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const xmlBuffer = await this.depotService.downloadXml(id);
    const depot = await this.depotService.findById(id);

    res.attachment(depot.nomOriginalFichier);
    res.type('application/xml');
    res.send(xmlBuffer);
  }
}
