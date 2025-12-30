import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { SharedModule } from '@shared/shared.module';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationMiddleware } from './authentication.middleware';
import { MeGuard } from './me.guard';

@Module({
  imports: [SharedModule],
  controllers: [AuthenticationController],
  providers: [...createAuthenticationProviders(), AuthenticationMiddleware, MeGuard],
  exports: [Authentication, AuthenticationMiddleware, MeGuard],
})
export class AuthenticationModule {}
