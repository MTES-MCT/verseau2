import { Module } from '@nestjs/common';
import { DossierModule } from '@dossier/dossier.module';
import { SharedModule } from '@shared/shared.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';

@Module({
  imports: [DossierModule, InfraModule, SharedModule, NotificationModule, ReferentielModule],
})
export class ApiModule {}
