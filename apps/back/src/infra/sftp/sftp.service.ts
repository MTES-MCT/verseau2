import { Inject, Injectable } from '@nestjs/common';
import path from 'node:path';
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

  async send(file: Buffer, remotePath: string): Promise<void> {
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        privateKey: this.config.privateKey,
      });

      const remoteDirectory = path.posix.dirname(remotePath);
      if (remoteDirectory !== '.') {
        await this.sftpClient.mkdir(remoteDirectory, true);
      }

      this.logger.log(`Uploading file to SFTP: ${remotePath}`);
      await this.sftpClient.put(file, remotePath);
    } finally {
      await this.sftpClient.end();
    }
  }

  async sendToAgentVerseau(file: Buffer, remotePath: string | undefined): Promise<void> {
    if (!remotePath) {
      throw new Error('Remote path is undefined');
    }

    await this.send(file, `uploads/${remotePath}`);
  }
}
