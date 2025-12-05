import { Injectable } from '@nestjs/common';
import { Sftp } from './sftp';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class SftpProviderMock implements Sftp {
  private readonly logger = new LoggerService(SftpProviderMock.name);

  async send(file: Buffer, remotePath: string): Promise<void> {
    this.logger.log(`[MOCK] Uploading file to SFTP: ${remotePath}`);
    this.logger.log(`[MOCK] File size: ${file.length} bytes`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`[MOCK] Upload complete: ${remotePath}`);
  }
}
