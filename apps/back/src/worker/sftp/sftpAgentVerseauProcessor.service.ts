import { Inject, Injectable } from '@nestjs/common';
import { Sftp } from '@infra/sftp/sftp';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
import { addNameTagToXml } from '@lib/parser';
@Injectable()
export class SftpAgentVerseauProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(Sftp) private readonly sftpService: Sftp,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
  ) {
    this.logger.setContext(SftpAgentVerseauProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.SFTP_IN_PROGRESS,
      etapeMetier: EtapeMetier.FINALISATION_IMPORT,
    });

    try {
      this.logger.log('Downloading file', filePath);
      const depot = await this.depotService.findDepotByIdWithUser(depotId);
      if (!depot) {
        throw new Error(`Depot with id ${depotId} not found`);
      }
      const file = await this.s3.download(filePath);

      let fileToSend = file;
      if (depot.user) {
        const xmlContent = file.toString('utf-8');
        const fullName = `${depot.user.nom.toUpperCase() || ''} ${depot.user.prenom || ''} `.trim();
        if (fullName) {
          const modifiedXml = addNameTagToXml(xmlContent, fullName);
          fileToSend = Buffer.from(modifiedXml, 'utf-8');
          this.logger.log(`Added NomContact tag to XML for user ${depot.userId} in depot ${depotId}`);
        }
      }

      await this.sftpService.sendToAgentVerseau(fileToSend, depot.path);
      await this.sftpService.sendToAgentVerseau(Buffer.alloc(0), `${depot.path}.ack`);
      await this.depotService.update(depotId, {
        step: DepotStep.SFTP_COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process file',
        error instanceof Error ? error.stack || error.message : String(error),
      );
      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.SFTP_FAILED,
      });
      throw error;
    }
  }
}
