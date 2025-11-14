export interface S3 {
  upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void>;
  download(key: string): Promise<Buffer>;
}

export const S3 = Symbol('S3');
