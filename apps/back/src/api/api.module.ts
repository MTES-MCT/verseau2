import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { FrontendStaticModule } from './frontend/frontend-static.module';
import { CorrelationIdMiddleware } from './middleware/correlationId.middleware';
import { LoggerRequestMiddleware } from './middleware/loggerRequest.middleware';
import { VersionController } from './version.controller';
import { AuthenticationModule } from '@authentication/authentication.module';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';

@Module({
  imports: [
    AuthenticationModule,
    FrontendStaticModule,
    DossierModule,
    InfraModule,
    NotificationModule,
    ReferentielModule,
  ],
  controllers: [VersionController],
  providers: [
    CorrelationIdMiddleware,
    LoggerRequestMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ApiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, LoggerRequestMiddleware).forRoutes('{*all}');
    consumer
      .apply(AuthenticationMiddleware)
      .exclude({ path: 'auth/login', method: RequestMethod.GET })
      .exclude({ path: 'auth/callback', method: RequestMethod.POST })
      .exclude({ path: 'auth/refresh', method: RequestMethod.POST })
      .exclude({ path: 'webhook/masa/agent-verseau', method: RequestMethod.POST })
      .forRoutes('{*all}');
  }
}
