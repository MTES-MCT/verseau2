import { Injectable } from '@nestjs/common';
import { Sftp } from './sftp';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class SftpProviderMock implements Sftp {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SftpProviderMock.name);
  }

  async send(file: Buffer, filePath: string): Promise<void> {
    this.logger.log(`[MOCK] Uploading file to SFTP: ${filePath}`);
    this.logger.log(`[MOCK] File size: ${file.length} bytes`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`[MOCK] Upload complete: ${filePath}`);
  }

  async sendRejection(file: Buffer, filePath: string): Promise<void> {
    this.logger.log(`[MOCK] Sending rejected file to SFTP at path: ${filePath}`);
    await this.send(file, filePath);
  }

  async sendToAgentVerseau(file: Buffer, remotePath: string): Promise<void> {
    this.logger.log(`[MOCK] Sending file to Agent Verseau at path: ${remotePath}`);
    await this.send(file, `uploads/${remotePath}`);
  }
}
