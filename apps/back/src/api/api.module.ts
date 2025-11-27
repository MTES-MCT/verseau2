import { Module } from '@nestjs/common';
import { DossierModule } from '@dossier/dossier.module';
import { SharedModule } from '@shared/shared.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';

@Module({
  imports: [DossierModule, InfraModule, SharedModule, NotificationModule],
})
export class ApiModule {}
