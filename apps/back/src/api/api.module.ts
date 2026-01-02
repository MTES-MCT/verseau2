import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { SharedModule } from '@shared/shared.module';
import { FrontendStaticModule } from './frontend/frontend-static.module';
import { CorrelationIdMiddleware } from '@shared/middlleware/correlationId.middleware';
import { LoggerRequestMiddleware } from '@shared/middlleware/loggerRequest.middleware';
import { VersionController } from './version.controller';
import { AuthenticationModule } from '@authentication/authentication.module';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';

@Module({
  imports: [
    AuthenticationModule,
    FrontendStaticModule,
    DossierModule,
    InfraModule,
    SharedModule,
    NotificationModule,
    ReferentielModule,
  ],
  controllers: [VersionController],
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
