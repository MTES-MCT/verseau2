import { Inject, Injectable } from '@nestjs/common';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
import { setContactInXml } from '@lib/parser';
import { MasaProvider } from '@masa/masa.provider';

@Injectable()
export class SftpAgentVerseauProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(AgentVerseauClient) private readonly agentVerseauClient: AgentVerseauClient,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
    private readonly masaProvider: MasaProvider,
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
      const depot = await this.depotService.findDepotByIdWithUser(depotId);
      if (!depot) {
        throw new Error(`Depot with id ${depotId} not found`);
      }
      if (!depot.path) {
        throw new Error('Remote path is undefined');
      }
      if (!depot.user?.email) {
        throw new Error(`Depot with id ${depotId} has no associated user email`);
      }

      const contact = await this.masaProvider.findAgentByOrionLogin(depot.user.email);
      const nom = contact?.nom?.trim();
      const prenom = contact?.prenom?.trim();
      if (!nom || !prenom) {
        throw new Error(`AG contact is missing or incomplete for depot ${depotId}`);
      }

      this.logger.log('Downloading file', { depotId, filePath });
      const file = await this.s3.download(filePath);
      const xmlContent = file.toString('utf-8');
      const modifiedXml = setContactInXml(xmlContent, {
        nomContact: `${nom.toUpperCase()} ${prenom}`,
        melContact: contact?.mail ?? null,
      });
      const fileToSend = Buffer.from(modifiedXml, 'utf-8');

      this.logger.log(`Set AG contact in XML for user ${depot.userId} in depot ${depotId}`);

      // The external filename is independent of the S3 key.
      const remotePath = `${depot.id}_${depot.nomOriginalFichier}`;
      await this.agentVerseauClient.send(fileToSend, remotePath);
      await this.agentVerseauClient.send(Buffer.alloc(0), `${remotePath}.ack`);
      await this.depotService.update(depotId, {
        step: DepotStep.SFTP_COMPLETED,
      });
      this.logger.log('Files sent to Agent Verseau', { depotId });
    } catch (error: unknown) {
      this.logger.log('Failed to process file', {
        depotId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.SFTP_FAILED,
      });
      throw error;
    }
  }
}
