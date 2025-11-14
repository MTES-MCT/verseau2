import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3 } from './s3';
import { createS3Providers } from './s3.factory';

@Module({})
export class S3Module {
  static forRootAsync(): DynamicModule {
    return {
      module: S3Module,
      imports: [ConfigModule],
      providers: createS3Providers(),
      exports: [S3],
    };
  }
}
