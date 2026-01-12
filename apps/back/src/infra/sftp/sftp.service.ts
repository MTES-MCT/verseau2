import { Inject, Injectable } from '@nestjs/common';
import Client from 'ssh2-sftp-client';
import { Sftp } from './sftp';
import { LoggerService } from '@shared/logger/logger.service';

export const SFTP_CLIENT = Symbol('SFTP_CLIENT');

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

@Injectable()
export class SftpService implements Sftp {
  constructor(
    @Inject(SFTP_CLIENT) private readonly sftpClient: Client,
    private readonly config: SftpConfig,
    private logger: LoggerService,
  ) {
    this.logger.setContext(SftpService.name);
  }

  async sendToAgentVerseau(file: Buffer, remotePath: string | undefined): Promise<void> {
    if (!remotePath) {
      throw new Error('Remote path is undefined');
    }
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        privateKey: this.config.privateKey,
      });
      const path = `uploads/${remotePath}`;
      this.logger.log(`Uploading file to SFTP: ${path}`);
      await this.sftpClient.put(file, path);
    } finally {
      await this.sftpClient.end();
    }
  }
}
