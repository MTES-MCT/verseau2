import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Sftp } from './sftp';
import { createSftpProviders } from './sftp.factory';

@Module({})
export class SftpModule {
  static forRootAsync(): DynamicModule {
    return {
      module: SftpModule,
      imports: [ConfigModule],
      providers: createSftpProviders(),
      exports: [Sftp],
    };
  }
}
