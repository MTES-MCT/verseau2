import { Module } from '@nestjs/common';
import { S3 } from '@s3/s3';

@Module({
  imports: [],
  providers: [
    {
      provide: S3,
      useValue: {
        upload: jest.fn().mockResolvedValue(undefined),
        download: jest.fn().mockResolvedValue(Buffer.from('mock')),
      },
    },
  ],
  exports: [S3],
})
export class S3MockModule {}
