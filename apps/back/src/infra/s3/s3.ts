import type { Readable } from 'node:stream';

export interface S3 {
  upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  /** Caller must consume or destroy the stream. No full-object buffering. */
  downloadStream(key: string, signal?: AbortSignal): Promise<{ stream: Readable; size: number }>;
  createUploadUrl(key: string, expiresIn: number, size: number): Promise<string>;
  head(key: string): Promise<{ size: number; contentType?: string; etag: string } | null>;
  copy(sourceKey: string, destinationKey: string, etag: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export const S3 = Symbol('S3');
