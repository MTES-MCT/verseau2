import { Inject, Injectable } from '@nestjs/common';
import path from 'node:path';
import Client from 'ssh2-sftp-client';
import { Sftp } from './sftp';
import { LoggerService } from '@shared/logger/logger.service';

export const SFTP_CLIENT = Symbol('SFTP_CLIENT');

interface SftpConnectionConfig {
  host: string;
  port: number;
  username: string;
  remotePath?: string;
}

export type SftpCredentials =
  | {
      privateKey: string;
      password?: never;
    }
  | {
      password: string;
      privateKey?: never;
    };

export type SftpConfig = SftpConnectionConfig & SftpCredentials;

@Injectable()
export class SftpService implements Sftp {
  constructor(
    @Inject(SFTP_CLIENT) private readonly sftpClient: Client,
    private readonly config: SftpConfig,
    private logger: LoggerService,
  ) {
    this.logger.setContext(SftpService.name);
  }

  async send(file: Buffer, filePath: string): Promise<void> {
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        ...(this.config.privateKey ? { privateKey: this.config.privateKey } : { password: this.config.password }),
      });

      // Prepend config remotePath if it exists
      const basePath = this.config.remotePath || '';
      const fullPath = basePath ? `${basePath}/${filePath}` : filePath;

      const remoteDirectory = path.posix.dirname(fullPath);
      if (remoteDirectory !== '.') {
        await this.sftpClient.mkdir(remoteDirectory, true);
      }

      this.logger.log(`Uploading file to SFTP: ${fullPath}`);
      await this.sftpClient.put(file, fullPath);
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
