import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from '@infra/s3/s3.service';
import { customizeMockS3Client } from '@infra/s3/s3.provider.mock';

describe('Direct S3 upload protocol', () => {
  let container: StartedTestContainer;
  let client: S3Client;
  let s3: S3Service;

  beforeAll(async () => {
    container = await new GenericContainer('adobe/s3mock:4.7.0')
      .withExposedPorts(9090)
      .withWaitStrategy(Wait.forHttp('/favicon.ico', 9090))
      .start();
    client = new S3Client({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9090)}`,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    await customizeMockS3Client(
      new ConfigService({ S3_BUCKET: 'uploads-test', CORS_ORIGIN: 'http://localhost:5173' }),
      client,
    );
    s3 = new S3Service('uploads-test', client);
  });

  afterAll(async () => {
    client?.destroy();
    await container?.stop();
  });

  it('supports CORS preflight, a raw PUT, HEAD, conditional copy and cleanup', async () => {
    const key = 'uploads/dep_test/données été.xml';
    const url = await s3.createUploadUrl(key, 900);
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(new URL(url).searchParams.has('x-amz-checksum-crc32')).toBe(false);
    const preflight = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(preflight.ok).toBe(true);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const uploaded = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: '<root/>',
    });
    expect(uploaded.ok).toBe(true);
    const metadata = await s3.head(key);
    expect(metadata).toMatchObject({ size: 7, contentType: 'application/xml' });
    await s3.copy(key, 'dep_test.xml', metadata!.etag);
    expect(await s3.download('dep_test.xml')).toEqual(Buffer.from('<root/>'));
    await s3.delete(key);
    expect(await s3.head(key)).toBeNull();
    expect(await s3.head('dep_test.xml')).not.toBeNull();
  });
});
