export interface S3 {
  upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  createUploadUrl(key: string, expiresIn: number): Promise<string>;
  head(key: string): Promise<{ size: number; contentType?: string; etag: string } | null>;
  copy(sourceKey: string, destinationKey: string, etag: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export const S3 = Symbol('S3');
