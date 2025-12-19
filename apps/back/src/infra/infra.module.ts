import { Global, Module } from '@nestjs/common';
import { S3Module } from './s3/s3.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from './database/database.module';
import { AuthenticationModule } from '@authentication/authentication.module';
import { SftpModule } from './sftp/sftp.module';
import { ConfigurationModule } from './config/configuration.module';

@Global()
@Module({
  imports: [
    S3Module.forRootAsync(),
    QueueModule,
    DatabaseModule,
    AuthenticationModule,
    SftpModule.forRootAsync(),
    ConfigurationModule,
  ],
  exports: [S3Module, QueueModule, DatabaseModule, AuthenticationModule, SftpModule],
})
export class InfraModule {}
