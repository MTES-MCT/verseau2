import { Module } from '@nestjs/common';
import { FileProcessorService } from './file_processor/file.processor.service';
import { QueueModule } from '@queue/queue.module';
import { S3Module } from '@s3/s3.module';
import { ReferentielModule } from './referentiel/referentiel.module';

@Module({
  imports: [QueueModule, S3Module.forRootAsync(), ReferentielModule],
  providers: [FileProcessorService],
})
export class WorkerModule {}
