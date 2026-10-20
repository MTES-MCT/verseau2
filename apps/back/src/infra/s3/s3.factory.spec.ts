import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { createS3Service } from './s3.factory';

describe('createS3Service', () => {
  let s3Client: S3Client;

  beforeEach(() => {
    s3Client = new S3Client({
      endpoint: 'https://s3.example.test',
      region: 'eu-west-1',
      credentials: { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  });

  afterEach(() => {
    s3Client.destroy();
  });

  it.each(['outscale', undefined])('ignores the mock public endpoint for provider %s', async (provider) => {
    const service = createS3Service(
      new ConfigService({
        S3_BUCKET: 'test-bucket',
        S3_PROVIDER: provider,
        S3_PUBLIC_ENDPOINT: 'not-a-valid-endpoint',
      }),
      s3Client,
    );

    const uploadUrl = new URL(await service.createUploadUrl('uploads/test.xml', 900, 42));

    expect(uploadUrl.origin).toBe('https://s3.example.test');
    expect(uploadUrl.pathname).toBe('/test-bucket/uploads/test.xml');
  });

  it('uses the browser endpoint for mock upload URLs', async () => {
    const service = createS3Service(
      new ConfigService({
        S3_BUCKET: 'test-bucket',
        S3_PROVIDER: 'mock',
        S3_PUBLIC_ENDPOINT: 'http://localhost:9090',
      }),
      s3Client,
    );

    const uploadUrl = new URL(await service.createUploadUrl('uploads/test.xml', 900, 42));

    expect(uploadUrl.origin).toBe('http://localhost:9090');
    expect(uploadUrl.pathname).toBe('/test-bucket/uploads/test.xml');
    expect(uploadUrl.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });

  it('uses the original endpoint when the mock public endpoint is unset', async () => {
    const service = createS3Service(new ConfigService({ S3_BUCKET: 'test-bucket', S3_PROVIDER: 'mock' }), s3Client);

    const uploadUrl = new URL(await service.createUploadUrl('uploads/test.xml', 900, 42));

    expect(uploadUrl.origin).toBe('https://s3.example.test');
  });
});
