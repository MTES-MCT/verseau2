import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationMiddleware } from './authentication.middleware';
import { MeGuard } from './me.guard';
import { UserModule } from '@user/user.module';

@Module({
  imports: [UserModule],
  controllers: [AuthenticationController],
  providers: [...createAuthenticationProviders(), AuthenticationMiddleware, MeGuard],
  exports: [Authentication, AuthenticationMiddleware, MeGuard],
})
export class AuthenticationModule {}
