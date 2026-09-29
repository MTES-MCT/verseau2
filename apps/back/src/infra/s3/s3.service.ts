import { Inject, Injectable } from '@nestjs/common';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { S3 } from './s3';
export const S3_CLIENT = Symbol('S3_CLIENT');

@Injectable()
export class S3Service implements S3 {
  private readonly bucket: string;

  constructor(
    bucket: string,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly uploadClient: S3Client = s3Client,
  ) {
    this.bucket = bucket;
  }

  async upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
  }

  async createUploadUrl(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
      this.uploadClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: 'application/xml',
      }),
      { expiresIn, signableHeaders: new Set(['content-type']) },
    );
  }

  async head(key: string): Promise<{ size: number; contentType?: string; etag: string } | null> {
    try {
      const result = await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      if (result.ContentLength === undefined || !result.ETag) {
        throw new Error('Missing S3 object metadata');
      }
      return { size: result.ContentLength, contentType: result.ContentType, etag: result.ETag };
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async copy(sourceKey: string, destinationKey: string, etag: string): Promise<void> {
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${this.bucket}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`,
        CopySourceIfMatch: etag,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    if (response.Body instanceof Readable) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : new Uint8Array(chunk));
      }
      return Buffer.concat(chunks);
    } else {
      throw new Error('Unexpected response body type');
    }
  }
}
