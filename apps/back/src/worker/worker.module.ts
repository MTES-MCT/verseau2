import { Module } from '@nestjs/common';
import { FileProcessorService } from './file_processor/file.processor.service';
import { QueueModule } from '../infra/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [FileProcessorService],
})
export class WorkerModule {}
