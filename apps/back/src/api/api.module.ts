import { MiddlewareConsumer, Module } from '@nestjs/common';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { SharedModule } from '@shared/shared.module';
import { FrontendStaticModule } from './frontend/frontend-static.module';
import { CorrelationIdMiddleware } from '@shared/middlleware/correlationId.middleware';
import { LoggerRequestMiddleware } from '@shared/middlleware/loggerRequest.middleware';

@Module({
  imports: [FrontendStaticModule, DossierModule, InfraModule, SharedModule, NotificationModule, ReferentielModule],
})
export class ApiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, LoggerRequestMiddleware).forRoutes('{*all}');
  }
}
