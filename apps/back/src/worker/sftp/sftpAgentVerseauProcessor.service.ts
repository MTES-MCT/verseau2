import { Inject, Injectable } from '@nestjs/common';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
import { addEmailTagToXml, addNameTagToXml } from '@lib/parser';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';

@Injectable()
export class SftpAgentVerseauProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(AgentVerseauClient) private readonly agentVerseauClient: AgentVerseauClient,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
    private readonly depotService: DepotService,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
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

      const contact = await this.lanceleauGateway.findOrionContactByEmail(depot.user.email);
      if (!contact?.nom || !contact.prenom) {
        throw new Error(`Orion contact is missing or incomplete for depot ${depotId}`);
      }

      this.logger.log('Downloading file', filePath);
      const file = await this.s3.download(filePath);
      const xmlContent = file.toString('utf-8');
      const fullName = `${contact.nom.toUpperCase()} ${contact.prenom}`;
      let modifiedXml = addNameTagToXml(xmlContent, fullName);
      if (contact.email) {
        modifiedXml = addEmailTagToXml(modifiedXml, contact.email);
      }
      const fileToSend = Buffer.from(modifiedXml, 'utf-8');

      this.logger.log(
        `Added name: ${fullName} and email: ${contact.email} to XML for user ${depot.userId} in depot ${depotId}`,
      );

      await this.agentVerseauClient.send(fileToSend, depot.path);
      await this.agentVerseauClient.send(Buffer.alloc(0), `${depot.path}.ack`);
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
