import { Module } from '@nestjs/common';
import { FileProcessorService } from './fileProcessor/fileProcessor.service';
import { DossierModule } from '@dossier/dossier.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { UserModule } from '@user/user.module';

import { WorkerService } from './worker.service';
import { SftpAgentVerseauProcessorService } from './sftp/sftpAgentVerseauProcessor.service';
import { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import { ControleSandreUploadProcessorService } from './controleSandre/controle-sandre-upload.processor.service';
import { ControleSandrePollProcessorService } from './controleSandre/controle-sandre-poll.processor.service';
import { MasaWebhookProcessorService } from './masa/masaWebhookProcessor.service';
import { DiffusionRapportProcessorService } from './diffusionRapport/diffusionRapportProcessor.service';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { MasaModule } from '@masa/masa.module';

@Module({
  imports: [InfraModule, DossierModule, NotificationModule, ReferentielModule, UserModule, MasaModule],
  providers: [
    FileProcessorService,
    WorkerService,
    SftpAgentVerseauProcessorService,
    ControleMetierProcessorService,
    ControleSandreUploadProcessorService,
    ControleSandrePollProcessorService,
    MasaWebhookProcessorService,
    DiffusionRapportProcessorService,
    RapportPdfGeneratorService,
  ],
})
export class WorkerModule {}
