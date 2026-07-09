import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SftpModule } from '../sftp/sftp.module';
import { AgentVerseauClient } from './agentVerseauClient';
import { createAgentVerseauClientProviders } from './agentVerseauClient.factory';

@Module({})
export class AgentVerseauClientModule {
  static forRootAsync(): DynamicModule {
    return {
      module: AgentVerseauClientModule,
      imports: [ConfigModule, SftpModule.forRootAsync()],
      providers: [...createAgentVerseauClientProviders()],
      exports: [AgentVerseauClient],
    };
  }
}
