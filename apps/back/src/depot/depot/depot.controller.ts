import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueueService } from '@queue/queue.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DepotService } from './depot.service';

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
    private readonly queueService: QueueService,
    private readonly depotService: DepotService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: MulterFile | undefined): Promise<{ jobId: string | null }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const isXmlFile =
      file.mimetype === 'application/xml' ||
      file.mimetype === 'text/xml' ||
      file.originalname.toLowerCase().endsWith('.xml');

    if (!isXmlFile) {
      throw new BadRequestException('File must be an XML file');
    }

    this.logger.log('Uploading XML file', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    const depot = await this.depotService.create({
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      buffer: file.buffer.toString('base64'),
    });

    this.logger.log('Depot created', { depotId: depot.id });

    return { jobId: depot.id };
  }
}
