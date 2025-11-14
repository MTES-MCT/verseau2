import { Inject, Injectable } from '@nestjs/common';
import { DepotService } from '../depot.service';
import { DepotDeFichier } from '../file/file';
import { QueueService } from '@queue/queue.service';
import { S3 } from '@s3/s3';
import { QueueName } from '@queue/queue';
import { DepotModel } from '../depot.model';
import { UseCase } from '@shared/useCase';

@Injectable()
export class DeposerUnFichier implements UseCase<DepotModel> {
  constructor(
    private readonly depotService: DepotService,
    private readonly queueService: QueueService,
    @Inject(S3) private readonly s3: S3,
  ) {}

  async execute(depotData: DepotDeFichier): Promise<DepotModel> {
    const depot = await this.depotService.create({
      nomOriginalFichier: depotData.nomOriginalFichier,
      tailleFichier: depotData.size,
      type: depotData.type,
      buffer: depotData.buffer,
    });

    const filePath = `${depot.id}_${depot.nomOriginalFichier}.xml`;

    await this.s3.upload(filePath, depotData.buffer);
    await this.queueService.send(QueueName.process_file, {
      id: depot.id,
      filePath: filePath,
    });

    return depot;
  }
}
