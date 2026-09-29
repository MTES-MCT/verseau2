import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { S3Service } from '@infra/s3/s3.service';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

// Adobe S3Mock does not validate presigned signatures; use MinIO for size enforcement.
describe('Presigned S3 upload size enforcement', () => {
  let container: StartedTestContainer;
  let client: S3Client;
  let s3: S3Service;
  const file = new File(['<é/>'], 'test.xml', { type: 'application/xml' });

  beforeAll(async () => {
    container = await new GenericContainer('bitnamilegacy/minio:2025.7.23-debian-12-r5')
      .withEnvironment({ MINIO_ROOT_USER: 'test-access', MINIO_ROOT_PASSWORD: 'test-secret' })
      .withEntrypoint(['/opt/bitnami/minio/bin/minio'])
      .withCommand(['server', '/tmp/data'])
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forHttp('/minio/health/ready', 9000))
      .start();
    client = new S3Client({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9000)}`,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: 'test-access', secretAccessKey: 'test-secret' },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    await client.send(new CreateBucketCommand({ Bucket: 'upload-size-test' }));
    s3 = new S3Service('upload-size-test', client);
  });

  afterAll(async () => {
    client?.destroy();
    await container?.stop();
  });

  it('accepts a file of the declared byte size with an automatically generated Content-Length', async () => {
    const key = 'uploads/exact-size.xml';
    const url = await s3.createUploadUrl(key, 900, file.size);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: file,
    });

    expect(response.status).toBe(200);
    expect(await s3.head(key)).toMatchObject({ size: file.size });
  });

  it.each([
    ['oversized', '<root/>'],
    ['undersized', '<a/>'],
  ])('rejects an %s file before storing it', async (label, body) => {
    const key = `uploads/${label}.xml`;
    const url = await s3.createUploadUrl(key, 900, file.size);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body,
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toContain('SignatureDoesNotMatch');
    expect(await s3.head(key)).toBeNull();
  });
});
