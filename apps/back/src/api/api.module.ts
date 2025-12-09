import { Module } from '@nestjs/common';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { SharedModule } from '@shared/shared.module';
import { FrontendStaticModule } from './frontend/frontend-static.module';

@Module({
  imports: [FrontendStaticModule, DossierModule, InfraModule, SharedModule, NotificationModule, ReferentielModule],
})
export class ApiModule {}
