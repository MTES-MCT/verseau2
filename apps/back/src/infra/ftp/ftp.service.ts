import { Injectable } from '@nestjs/common';
import { Client } from 'basic-ftp';
import path from 'node:path';
import { Readable } from 'node:stream';
import { TransferClient } from '../transferClient/transferClient';
import { LoggerService } from '@shared/logger/logger.service';

export interface FtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath?: string;
  secure?: boolean | 'implicit';
}

@Injectable()
export class FtpService implements TransferClient {
  constructor(
    private readonly ftpClient: Client,
    private readonly config: FtpConfig,
    private logger: LoggerService,
  ) {
    this.logger.setContext(FtpService.name);
  }

  async send(file: Buffer, filePath: string): Promise<void> {
    try {
      await this.ftpClient.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        secure: this.config.secure,
      });

      const basePath = this.config.remotePath || '';
      const fullPath = basePath ? `${basePath}/${filePath}` : filePath;
      const remoteDirectory = path.posix.dirname(fullPath);
      const remoteFileName = path.posix.basename(fullPath);

      if (remoteDirectory !== '.') {
        await this.ftpClient.ensureDir(remoteDirectory);
      }

      this.logger.log(`Uploading file to FTP: ${fullPath}`);
      await this.ftpClient.uploadFrom(Readable.from([file]), remoteFileName);
    } finally {
      this.ftpClient.close();
    }
  }
}
