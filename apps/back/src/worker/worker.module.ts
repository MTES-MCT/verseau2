import { Module } from '@nestjs/common';
import { FileProcessorService } from './fileProcessor/fileProcessor.service';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { SharedModule } from '@shared/shared.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';

import { WorkerService } from './worker.service';
import { SftpProcessorService } from './sftp/sftpProcessor.service';
import { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import { ControleSandreProcessorService } from './controleSandre/controle-sandre.processor.service';
import { MasaProcessorService } from './masa/masaProcessor.service';
import { EmailProcessorService } from './email/emailProcessor.service';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';

@Module({
  imports: [InfraModule, DossierModule, SharedModule, NotificationModule, ReferentielModule],
  providers: [
    FileProcessorService,
    WorkerService,
    SftpProcessorService,
    ControleMetierProcessorService,
    ControleSandreProcessorService,
    MasaProcessorService,
    EmailProcessorService,
    RapportPdfGeneratorService,
  ],
})
export class WorkerModule {}
