import { Module } from '@nestjs/common';
import { FileProcessorService } from './file_processor/file.processor.service';
import { QueueModule } from '@queue/queue.module';
import { S3Module } from '@s3/s3.module';
import { S3Service } from '@s3/s3.service';
import { S3 } from '@s3/s3';

@Module({
  imports: [QueueModule, S3Module.forRootAsync()],
  providers: [FileProcessorService, { provide: S3, useClass: S3Service }],
})
export class WorkerModule {}
