import { Inject, Injectable } from '@nestjs/common';
import { DepotService } from '../depot.service';
import { DepotDeFichier, FichierDeDepot } from '../file/file';
import { QueueService } from '@queue/queue.service';
import { S3 } from '@s3/s3';
import { QueueName } from '@queue/queue';
import { DepotModel } from '../depot.model';
import { UseCase } from '@shared/useCase';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class DeposerUnFichier implements UseCase<DepotModel> {
  constructor(
    private readonly depotService: DepotService,
    private readonly queueService: QueueService,
    @Inject(S3) private readonly s3: S3,
  ) {}

  private readonly logger = new LoggerService(DeposerUnFichier.name);

  async execute(depotData: DepotDeFichier): Promise<DepotModel> {
    const depot = await this.depotService.create({
      nomOriginalFichier: depotData.nomOriginalFichier,
      tailleFichier: depotData.size,
      type: depotData.type,
      buffer: depotData.buffer,
    });

    const filePath = `${depot.id}_${depot.nomOriginalFichier}.xml`;

    try {
      await this.s3.upload(filePath, depotData.buffer);
      await this.queueService.send<FichierDeDepot>(QueueName.process_file, {
        id: depot.id,
        filePath: filePath,
      });
    } catch (error) {
      this.logger.error('Failed to upload file to S3', error);
      throw error;
    }

    const depotWithPath = await this.depotService.update(depot.id, {
      path: filePath,
    });

    return depotWithPath;
  }
}
