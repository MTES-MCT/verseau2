import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { SharedModule } from '@shared/shared.module';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationGuard } from './authentication.guard';

@Module({
  imports: [SharedModule],
  controllers: [AuthenticationController],
  providers: [...createAuthenticationProviders(), AuthenticationGuard],
  exports: [Authentication, AuthenticationGuard],
})
export class AuthenticationModule {}
