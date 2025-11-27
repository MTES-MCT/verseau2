import { Module } from '@nestjs/common';
import { FileProcessorService } from './file-processor/file.processor.service';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { SharedModule } from '@shared/shared.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';

@Module({
  imports: [InfraModule, DossierModule, SharedModule, NotificationModule, ReferentielModule],
  providers: [FileProcessorService],
})
export class WorkerModule {}
