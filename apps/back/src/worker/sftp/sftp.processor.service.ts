import { Inject, Injectable } from '@nestjs/common';
import { Sftp } from '@infra/sftp/sftp';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
@Injectable()
export class SftpProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(Sftp) private readonly sftpService: Sftp,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
  ) {
    this.logger = new LoggerService(SftpProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    try {
      this.logger.log('Downloading file', filePath);
      const file = await this.s3.download(filePath);
      await this.sftpService.send(file, depotId);
    } catch (error: any) {
      this.logger.error('Failed to process file', error);
      throw error;
    }
  }
}
