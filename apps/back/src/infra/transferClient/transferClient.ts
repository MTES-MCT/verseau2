export interface TransferClient {
  send(file: Buffer, filePath: string): Promise<void>;
}
