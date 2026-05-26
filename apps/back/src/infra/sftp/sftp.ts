export interface Sftp {
  send(file: Buffer, remotePath: string): Promise<void>;
  sendToAgentVerseau(file: Buffer, remotePath: string | undefined): Promise<void>;
}

export const Sftp = Symbol('Sftp');
