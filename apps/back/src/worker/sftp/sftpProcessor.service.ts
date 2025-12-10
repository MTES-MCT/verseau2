import { Inject, Injectable } from '@nestjs/common';
import { Sftp } from '@infra/sftp/sftp';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus } from '@lib/dossier';
@Injectable()
export class SftpProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(Sftp) private readonly sftpService: Sftp,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
  ) {
    this.logger = new LoggerService(SftpProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.PROCESSING,
      step: DepotStep.SFTP_IN_PROGRESS,
    });

    try {
      this.logger.log('Downloading file', filePath);
      const file = await this.s3.download(filePath);
      await this.sftpService.send(file, depotId);
      await this.depotService.update(depotId, {
        status: DepotStatus.SUCCESS,
        step: DepotStep.SFTP_COMPLETED,
      });
    } catch (error: any) {
      this.logger.error('Failed to process file', error);
      await this.depotService.update(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.SFTP_FAILED,
      });
      throw error;
    }
  }
}
