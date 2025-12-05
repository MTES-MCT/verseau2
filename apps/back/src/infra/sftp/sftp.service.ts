import { Inject, Injectable } from '@nestjs/common';
import Client from 'ssh2-sftp-client';
import { Sftp } from './sftp';

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
  ) {}

  async send(file: Buffer, remotePath: string): Promise<void> {
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        privateKey: this.config.privateKey,
      });
      await this.sftpClient.put(file, remotePath);
    } finally {
      await this.sftpClient.end();
    }
  }
}
