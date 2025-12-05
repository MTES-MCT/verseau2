import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...createAuthenticationProviders()],
  exports: [Authentication],
})
export class AuthenticationModule {}
