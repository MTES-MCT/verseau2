export interface Sftp {
  sendToAgentVerseau(file: Buffer, remotePath: string | undefined): Promise<void>;
}

export const Sftp = Symbol('Sftp');
