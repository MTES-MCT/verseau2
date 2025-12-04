import { BadRequestException, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoggerService } from '@shared/logger/logger.service';
import { XML_EXTENSION, XML_MIME_TYPES } from '@shared/constants/mimeTypes';
import { DeposerUnFichier } from './usecase/deposerUnFichier';
import { DepotModel } from './depot.model';
import { AuthenticationGuard } from '@authentication/authentication.guard';
import { AuthenticatedUserDecorator } from '@authentication/authenticated-user.decorator';
import type { AuthenticatedUser } from '@authentication/authentication';
import { DepotService } from './depot.service';
import { UserService } from '@user/user.service';

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
  async uploadFile(@UploadedFile() file: MulterFile | undefined): Promise<DepotModel> {
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

    const depot = await this.deposerUnFichier.execute({
      nomOriginalFichier: file.originalname,
      size: file.size,
      type: file.mimetype,
      buffer: file.buffer,
    });

    this.logger.log('Depot created', { depotId: depot.id });

    return depot;
  }

  @Get()
  @UseGuards(AuthenticationGuard)
  async listMyDepots(@AuthenticatedUserDecorator() user: AuthenticatedUser): Promise<DepotModel[]> {
    const userEntity = await this.userService.findBySub(user.sub);
    return this.depotService.findByUserId(userEntity.id);
  }

  @Get('admin')
  @UseGuards(AuthenticationGuard)
  async listAllDepots(): Promise<DepotModel[]> {
    return this.depotService.findAllByAdmin();
  }
}
