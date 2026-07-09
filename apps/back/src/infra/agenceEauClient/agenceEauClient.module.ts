import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FtpModule } from '../ftp/ftp.module';
import { AgenceEauClient } from './agenceEauClient';
import { createAgenceEauClientProviders } from './agenceEauClient.factory';

@Module({})
export class AgenceEauClientModule {
  static forRootAsync(): DynamicModule {
    return {
      module: AgenceEauClientModule,
      imports: [ConfigModule, FtpModule],
      providers: [...createAgenceEauClientProviders()],
      exports: [AgenceEauClient],
    };
  }
}
