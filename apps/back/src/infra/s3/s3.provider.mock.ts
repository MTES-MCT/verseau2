import { ConfigService } from '@nestjs/config';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { LoggerService } from '@shared/logger/logger.service';

export const createMockS3Client = async (configService: ConfigService): Promise<S3Client> => {
  const logger = new LoggerService('createMockS3Client');
  const mockClient = new S3Client({
    endpoint: configService.get<string>('S3_ENDPOINT_MOCK', 'http://localhost:9090'),
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    forcePathStyle: true,
  });

  try {
    await mockClient.send(
      new HeadBucketCommand({
        Bucket: configService.getOrThrow<string>('OUTSCALE_BUCKET'),
      }),
    );
    logger.log(`Bucket ${configService.getOrThrow<string>('OUTSCALE_BUCKET')} already exists`);
  } catch {
    await mockClient.send(
      new CreateBucketCommand({
        Bucket: configService.getOrThrow<string>('OUTSCALE_BUCKET'),
      }),
    );
  }

  return mockClient;
};
