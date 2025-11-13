import { Global, Module } from '@nestjs/common';
import { S3Module } from './s3/s3.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from './database/database.module';

@Global()
@Module({
  imports: [S3Module.forRootAsync(), QueueModule, DatabaseModule],
  exports: [S3Module, QueueModule, DatabaseModule],
})
export class InfraModule {}
