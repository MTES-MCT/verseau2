import { Module } from '@nestjs/common';
import { Authentication } from './authentication';
import { createAuthenticationProviders } from './authentication.factory';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationMiddleware } from './authentication.middleware';
import { MeGuard } from './me.guard';
import { UserModule } from '@user/user.module';
import { ReferentielModule } from '@referentiel/referentiel.module';

@Module({
  imports: [UserModule, ReferentielModule],
  controllers: [AuthenticationController],
  providers: [...createAuthenticationProviders(), AuthenticationMiddleware, MeGuard],
  exports: [Authentication, AuthenticationMiddleware, MeGuard],
})
export class AuthenticationModule {}
