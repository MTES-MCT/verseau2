import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3_CLIENT, S3Service } from './s3.service';

@Module({})
export class S3Module {
  static forRootAsync(): DynamicModule {
    return {
      module: S3Module,
      imports: [ConfigModule],
      providers: [
        {
          provide: S3_CLIENT,
          useFactory: (configService: ConfigService) => {
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
        S3Service,
      ],
      exports: [S3Service, S3_CLIENT],
    };
  }
}
