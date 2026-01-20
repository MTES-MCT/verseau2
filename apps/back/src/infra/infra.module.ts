import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { S3Module } from './s3/s3.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from './database/database.module';
import { AuthenticationModule } from '@authentication/authentication.module';
import { SftpModule } from './sftp/sftp.module';
import { ConfigurationModule } from './config/configuration.module';
import { SharedModule } from '@shared/shared.module';
import { ThrottlerConfigModule } from './throttler/throttler.module';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    ThrottlerConfigModule,
    S3Module.forRootAsync(),
    QueueModule,
    DatabaseModule,
    AuthenticationModule,
    SftpModule.forRootAsync(),
    ConfigurationModule,
    SharedModule,
  ],
  exports: [ClsModule, S3Module, QueueModule, DatabaseModule, AuthenticationModule, SftpModule, ThrottlerConfigModule],
})
export class InfraModule {}
