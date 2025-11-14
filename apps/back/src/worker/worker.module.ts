import { Module } from '@nestjs/common';
import { FileProcessorService } from './file_processor/file.processor.service';
import { QueueModule } from '@queue/queue.module';
import { S3Module } from '@s3/s3.module';

@Module({
  imports: [QueueModule, S3Module.forRootAsync()],
  providers: [FileProcessorService],
})
export class WorkerModule {}
