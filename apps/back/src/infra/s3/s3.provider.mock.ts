import { ConfigService } from '@nestjs/config';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from './s3';
import { S3Service } from './s3.service';

export const createMockS3Service = (configService: ConfigService, s3Client: S3Client): S3 => {
  const bucket = configService.getOrThrow<string>('S3_BUCKET');
  // Docker's internal S3Mock address may not be reachable from the browser.
  const publicEndpoint = configService.get<string>('S3_PUBLIC_ENDPOINT');
  const uploadClient = publicEndpoint
    ? new S3Client({
        region: s3Client.config.region,
        credentials: s3Client.config.credentials,
        forcePathStyle: true,
        endpoint: publicEndpoint,
        requestChecksumCalculation: 'WHEN_REQUIRED',
      })
    : s3Client;
  return new S3Service(bucket, s3Client, uploadClient);
};

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
    // await delay(3000);

    logger.warn(`MOCK S3 - Sending command: ${command.constructor.name}`);
    return originalSend(command, options);
  };

  return s3Client;
};
