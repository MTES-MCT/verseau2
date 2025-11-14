import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';
import { S3_CLIENT } from './s3.service';
import { S3 } from './s3';
import { LoggerService } from '@shared/logger/logger.service';
import { createMockS3Client } from './s3.provider.mock';

export const createS3Service = (configService: ConfigService, s3Client: S3Client): S3 => {
  const s3Provider = configService.getOrThrow<string>('S3_PROVIDER');
  const logger = new LoggerService('createS3Service');
  logger.log(`Provider used : ${s3Provider}`);

  if (s3Provider === 'outscale') {
    const bucket = configService.getOrThrow<string>('OUTSCALE_BUCKET');
    return new S3Service(bucket, s3Client);
  }

  if (s3Provider === 'mock') {
    logger.log('!!!!!! Using Mock S3 Service !!!!!!');
    const bucket = configService.getOrThrow<string>('OUTSCALE_BUCKET');
    return new S3Service(bucket, s3Client);
  }

  throw new Error(`Invalid S3 provider: ${s3Provider}`);
};

export const createS3Providers = () => [
  {
    provide: S3_CLIENT,
    useFactory: async (configService: ConfigService) => {
      const s3Provider = configService.get<string>('S3_PROVIDER');

      if (s3Provider === 'mock') {
        return await createMockS3Client(configService);
      }

      return new S3Client({
        endpoint: configService.get<string>('OUTSCALE_ENDPOINT'),
        region: configService.get<string>('OUTSCALE_REGION'),
        credentials: {
          accessKeyId: configService.get<string>('OUTSCALE_ACCESS_KEY', ''),
          secretAccessKey: configService.get<string>('OUTSCALE_SECRET_KEY', ''),
        },
        forcePathStyle: true,
      });
    },
    inject: [ConfigService],
  },
  {
    provide: S3,
    inject: [ConfigService, S3_CLIENT],
    useFactory: createS3Service,
  },
];
