import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { AuthenticationGuard } from './authentication.guard';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...createAuthenticationProviders(), AuthenticationGuard],
  exports: [Authentication, AuthenticationGuard],
})
export class AuthenticationModule {}
