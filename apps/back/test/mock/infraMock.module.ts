import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { DatabaseMockModule } from './databaseMock.module';
import { AuthenticationModule } from '@authentication/authentication.module';
import { SftpModule } from '@infra/sftp/sftp.module';
import { ConfigurationModule } from '@infra/config/configuration.module';
import { S3MockModule } from './s3Mock.module';
import { QueueMockModule } from './queueMock.module';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    DatabaseMockModule,
    AuthenticationModule,
    S3MockModule,
    QueueMockModule,
    SftpModule.forRootAsync(),
    ConfigurationModule,
  ],
  exports: [
    ClsModule,
    DatabaseMockModule,
    AuthenticationModule,
    S3MockModule,
    QueueMockModule,
    SftpModule,
    ConfigurationModule,
  ],
})
export class InfraMockModule {}
