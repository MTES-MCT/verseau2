import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { AuthenticationGuard } from './authentication.guard';

@Module({})
export class AuthenticationModule {
  static forRootAsync(): DynamicModule {
    return {
      module: AuthenticationModule,
      imports: [ConfigModule],
      providers: [...createAuthenticationProviders(), AuthenticationGuard],
      exports: [Authentication, AuthenticationGuard],
    };
  }
}
