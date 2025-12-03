import { Inject, Injectable } from '@nestjs/common';
import { DepotService } from '../depot.service';
import { DepotDeFichier, FichierDeDepot } from '../file/file';
import { QueueService } from '@queue/queue.service';
import { S3 } from '@s3/s3';
import { QueueName } from '@queue/queue';
import { DepotModel } from '../depot.model';
import { UseCase } from '@shared/useCase';
import { LoggerService } from '@shared/logger/logger.service';
import { DepotError } from '../depotError';

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
    });

    const filePath = `${depot.id}_${depot.nomOriginalFichier}`;

    this.uploadAndEnqueue(depot.id, filePath, depotData).catch((error) => {
      this.logger.error('Failed to upload file to S3 or to enqueue', error);
    });

    return depot;
  }

  private async uploadAndEnqueue(depotId: string, filePath: string, depotData: DepotDeFichier): Promise<void> {
    this.logger.log('Uploading file to S3', {
      filePath: filePath,
      size: depotData.size,
      type: depotData.type,
    });

    try {
      await this.s3.upload(filePath, depotData.buffer);
    } catch (error) {
      this.logger.error('Failed to upload file to S3', (error as Error).message);
      await this.depotService.update(depotId, {
        error: DepotError.UPLOAD_FAILED,
      });
      throw error;
    }

    this.logger.log('File uploaded to S3', {
      filePath: filePath,
    });

    await this.depotService.update(depotId, {
      path: filePath,
    });

    try {
      await this.queueService.send<FichierDeDepot>(QueueName.process_file, {
        depotId: depotId,
        filePath: filePath,
      });
    } catch (error) {
      this.logger.error('Failed to enqueue file', (error as Error).message);
      await this.depotService.update(depotId, {
        error: DepotError.ENQUEUE_FAILED,
      });
    }
  }
}
