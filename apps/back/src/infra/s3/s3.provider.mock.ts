import { ConfigService } from '@nestjs/config';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { LoggerService } from '@shared/logger/logger.service';

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const customizeMockS3Client = async (configService: ConfigService, s3Client: S3Client): Promise<S3Client> => {
  const logger = new LoggerService('createMockS3Client');
  logger.warn('MOCK S3 - Using Mocked S3');

  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: configService.getOrThrow<string>('S3_BUCKET'),
      }),
    );
    logger.warn(`Bucket ${configService.getOrThrow<string>('S3_BUCKET')} already exists`);
  } catch {
    logger.warn(`Bucket ${configService.getOrThrow<string>('S3_BUCKET')} does not exist, creating it`);
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: configService.getOrThrow<string>('S3_BUCKET'),
      }),
    );
  }

  const originalSend = s3Client.send.bind(s3Client) as typeof s3Client.send;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s3Client.send = async function (command: any, options?: any) {
    await delay(3000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return originalSend(command, options);
  };

  return s3Client;
};
