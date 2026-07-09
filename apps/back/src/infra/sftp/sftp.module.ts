import { DynamicModule, Module } from '@nestjs/common';
import Client from 'ssh2-sftp-client';
import { SFTP_CLIENT } from './sftp.service';

@Module({})
export class SftpModule {
  static forRootAsync(): DynamicModule {
    return {
      module: SftpModule,
      providers: [
        {
          provide: SFTP_CLIENT,
          useFactory: () => new Client(),
        },
      ],
      exports: [SFTP_CLIENT],
    };
  }
}
