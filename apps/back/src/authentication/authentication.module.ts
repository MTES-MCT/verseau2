import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { SharedModule } from '@shared/shared.module';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationMiddleware } from './authentication.middleware';

@Module({
  imports: [SharedModule],
  controllers: [AuthenticationController],
  providers: [...createAuthenticationProviders(), AuthenticationMiddleware],
  exports: [Authentication, AuthenticationMiddleware],
})
export class AuthenticationModule {}
