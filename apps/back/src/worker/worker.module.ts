import { Module } from '@nestjs/common';
import { FileProcessorService } from './file-processor/file.processor.service';
import { ReferentielModule } from './referentiel/referentiel.module';
import { ControleSandreService } from './file-processor/controleSandre';
import { InfraModule } from '@infra/infra.module';
import { SharedModule } from '@shared/shared.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule as MainReferentielModule } from '@referentiel/referentiel.module';

@Module({
  imports: [InfraModule, ReferentielModule, SharedModule, NotificationModule, MainReferentielModule],
  providers: [FileProcessorService, ControleSandreService],
})
export class WorkerModule {}
