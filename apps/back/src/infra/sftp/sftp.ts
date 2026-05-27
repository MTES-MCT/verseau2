export interface Sftp {
  send(file: Buffer, filePath: string): Promise<void>;
  sendToAgentVerseau(file: Buffer, remotePath: string | undefined): Promise<void>;
}

export const Sftp = Symbol('Sftp');
