import { ConfigService } from '@nestjs/config';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { customizeMockS3Client } from './s3.provider.mock';

describe('customizeMockS3Client', () => {
  it('checks the bucket without trying to configure unsupported bucket CORS', async () => {
    const client = new S3Client({ region: 'us-east-1' });
    const send = jest.spyOn(client, 'send').mockResolvedValue({} as never);

    await customizeMockS3Client(new ConfigService({ S3_BUCKET: 'test-bucket' }), client);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    client.destroy();
  });

  it('creates a missing bucket without trying to configure unsupported bucket CORS', async () => {
    const client = new S3Client({ region: 'us-east-1' });
    const send = jest
      .spyOn(client, 'send')
      .mockImplementationOnce(() => {
        throw new Error('Bucket not found');
      })
      .mockResolvedValue({} as never);

    await customizeMockS3Client(new ConfigService({ S3_BUCKET: 'test-bucket' }), client);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
    client.destroy();
  });
});
