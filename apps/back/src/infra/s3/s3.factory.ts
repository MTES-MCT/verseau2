import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';
import { S3_CLIENT } from './s3.service';
import { S3 } from './s3';
import { customizeMockS3Client } from './s3.provider.mock';

export const createS3Service = (configService: ConfigService, s3Client: S3Client): S3 => {
  const bucket = configService.getOrThrow<string>('S3_BUCKET');
  return new S3Service(bucket, s3Client);
};

export const createS3Providers = () => [
  {
    provide: S3_CLIENT,
    useFactory: async (configService: ConfigService) => {
      const s3Client = new S3Client({
        endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
        region: configService.getOrThrow<string>('S3_REGION'),
        credentials: {
          accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY'),
          secretAccessKey: configService.getOrThrow<string>('S3_SECRET_KEY'),
        },
        requestHandler: {
          connectionTimeout: 10000,
          requestTimeout: 120000,
        },
        maxAttempts: 3,
        forcePathStyle: true,
      });

      const s3Provider = configService.get<string>('S3_PROVIDER');
      if (s3Provider === 'mock') {
        return await customizeMockS3Client(configService, s3Client);
      }

      if (s3Provider === 'outscale' || s3Provider === undefined) {
        return s3Client;
      }

      throw new Error(`Invalid S3 provider: ${s3Provider}`);
    },
    inject: [ConfigService],
  },
  {
    provide: S3,
    inject: [ConfigService, S3_CLIENT],
    useFactory: createS3Service,
  },
];
