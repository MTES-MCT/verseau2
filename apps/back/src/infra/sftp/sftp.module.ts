import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Sftp } from './sftp';
import { SftpAgency } from './sftpAgency';
import { createSftpAgentVerseauProviders } from './sftp.factory';
import { createSftpAgencyProviders } from './sftpAgency.factory';

@Module({})
export class SftpModule {
  static forRootAsync(): DynamicModule {
    return {
      module: SftpModule,
      imports: [ConfigModule],
      providers: [...createSftpAgentVerseauProviders(), ...createSftpAgencyProviders()],
      exports: [Sftp, SftpAgency],
    };
  }
}
