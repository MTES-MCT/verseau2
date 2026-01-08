import { Inject, Injectable } from '@nestjs/common';
import { Sftp } from '@infra/sftp/sftp';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
@Injectable()
export class SftpProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(Sftp) private readonly sftpService: Sftp,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
  ) {
    this.logger = new LoggerService(SftpProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.SFTP_IN_PROGRESS,
      etapeMetier: EtapeMetier.FINALISATION_IMPORT,
    });

    try {
      this.logger.log('Downloading file', filePath);
      const file = await this.s3.download(filePath);
      await this.sftpService.send(file, depotId);
      // Attente du retour MASA - pas de changement de status
      await this.depotService.update(depotId, {
        step: DepotStep.SFTP_COMPLETED,
        // status reste EN_COURS_DE_TRAITEMENT
      });
    } catch (error: any) {
      this.logger.error('Failed to process file', error);
      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.SFTP_FAILED,
      });
      throw error;
    }
  }
}
