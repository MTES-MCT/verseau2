import { BadRequestException, Controller, Get, Post, Query, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoggerService } from '@shared/logger/logger.service';
import { XML_EXTENSION, XML_MIME_TYPES } from '@shared/constants/mimeTypes';
import { DeposerUnFichier } from './usecase/deposerUnFichier';
import type { CustomRequest } from '@shared/constants/customRequest';
import { DepotService } from './depot.service';
import { UserService } from '@user/user.service';
import { DepotDto } from '@lib/dossier';

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
  private readonly logger = new LoggerService(DepotController.name);

  constructor(
    private readonly deposerUnFichier: DeposerUnFichier,
    private readonly depotService: DepotService,
    private readonly userService: UserService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: MulterFile | undefined, @Req() req: CustomRequest): Promise<DepotDto> {
    const user = req.user;
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const isXmlFile =
      file.mimetype === XML_MIME_TYPES.APPLICATION_XML ||
      file.mimetype === XML_MIME_TYPES.TEXT_XML ||
      file.originalname.toLowerCase().endsWith(XML_EXTENSION);

    if (!isXmlFile) {
      throw new BadRequestException('File must be an XML file');
    }

    const userEntity = await this.userService.findBySub(user.cerbereId);

    const depot = await this.deposerUnFichier.execute(
      {
        nomOriginalFichier: file.originalname,
        size: file.size,
        type: file.mimetype,
        buffer: file.buffer,
        utilisateur: {
          nom: user.nom,
          prenom: user.prenom,
        },
      },
      userEntity.id,
    );

    this.logger.log('Depot created', { depotId: depot.id });

    return depot;
  }

  @Get()
  async listMyDepots(@Req() req: CustomRequest): Promise<DepotDto[]> {
    const user = req.user;
    const userEntity = await this.userService.findBySub(user.cerbereId);
    return this.depotService.findByUserId(userEntity.id);
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
}
