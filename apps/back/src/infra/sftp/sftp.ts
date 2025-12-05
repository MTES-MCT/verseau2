export interface Sftp {
  send(file: Buffer, remotePath: string): Promise<void>;
}

export const Sftp = Symbol('Sftp');
