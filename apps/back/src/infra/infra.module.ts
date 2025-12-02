import { Global, Module } from '@nestjs/common';
import { S3Module } from './s3/s3.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from './database/database.module';
import { AuthenticationModule } from '@authentication/authentication.module';

@Global()
@Module({
  imports: [S3Module.forRootAsync(), QueueModule, DatabaseModule, AuthenticationModule.forRootAsync()],
  exports: [S3Module, QueueModule, DatabaseModule, AuthenticationModule],
})
export class InfraModule {}
