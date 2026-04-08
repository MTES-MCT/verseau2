import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { NotificationGateway } from '@notification/notification.gateway';
import { EmailTemplate, EmailRapportParams } from '@notification/notification';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { DepotModel } from '@dossier/depot/depot.model';
import { MasaModel, MasaStatus } from '@dossier/masa/masa.model';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { AsyncTask } from '@worker/asyncTask';
import { ControleGateway } from '@dossier/controle/controle.gateway';

interface MasaProcessorData {
  masaId: string;
  depotId: string;
}

@Injectable()
export class MasaWebhookProcessorService implements AsyncTask<MasaProcessorData> {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(NotificationGateway) private readonly notificationService: NotificationGateway,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(S3) private readonly s3: S3,
    @Inject(Sftp) private readonly sftpService: Sftp,
    private readonly pdfGenerator: RapportPdfGeneratorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MasaWebhookProcessorService.name);
  }

  // Gérer les cas d'erreur pour l'envoi au SFTP et le téléchargement depuis S3. Processor dédié ?
  async process(data: MasaProcessorData): Promise<void> {
    const { masaId, depotId } = data;
    this.logger.log(`Processing MASA report`, { masaId, depotId });

    try {
      // 1. Fetch MASA and Depot data
      const masa = await this.masaGateway.findById(masaId);
      if (!masa) {
        throw new Error(`MASA not found: ${masaId}`);
      }

      const depot = await this.depotGateway.findDepotByIdWithUser(depotId);
      if (!depot) {
        throw new Error(`Depot not found: ${depotId}`);
      }

      // 2. Mettre à jour le statut du dépôt selon le retour MASA
      const newStatus = this.mapMasaStatusToDepotStatus(masa.statut);
      await this.depotGateway.updateDepot(depotId, {
        status: newStatus,
        step: DepotStep.MASA_CALLED_ENPOINT,
        etapeMetier: null,
      });

      // 3. Generate PDF report
      const controlesV2 = await this.controleGateway.findControlesV2ByDepotId(depotId);
      this.logger.log(`Generating PDF report`, { masaId });
      const pdfBuffer = await this.pdfGenerator.generateReport(masa, depot, controlesV2);

      // 4. Upload PDF to S3
      const pdfPath = `rapports/${depotId}/${masaId}.pdf`;
      await this.s3.upload(pdfPath, pdfBuffer, 'application/pdf');
      this.logger.log(`PDF uploaded to S3`, { pdfPath });

      await this.depotGateway.updateDepot(depotId, { rapportPath: pdfPath });

      // 5. Send to Agence de l'eau SFTP
      await this.sendToAgenceDeEauSftp(depot, pdfBuffer);

      // 6. Send email to déposant
      await this.sendEmailToDeposant(depot, masa, pdfBuffer);

      if (!depot.path) {
        throw new Error(`No XML file path for depot: ${depotId}`);
      }

      this.logger.log(`MASA report processing completed`, { masaId, depotId });
    } catch (error) {
      this.logger.error(`Failed to process MASA report`, {
        masaId,
        depotId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private mapMasaStatusToDepotStatus(masaStatus: MasaStatus): DepotStatus {
    switch (masaStatus) {
      case MasaStatus.INTEGRE:
        return DepotStatus.INTEGRE;
      case MasaStatus.INTEGRATION_PARTIELLE:
        return DepotStatus.INTEGRE_PARTIELLEMENT;
      case MasaStatus.REFUSE:
        return DepotStatus.REJETE;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unknown MASA status: ${masaStatus}`);
    }
  }

  private async sendEmailToDeposant(depot: DepotModel, masa: MasaModel, pdfBuffer: Buffer): Promise<void> {
    const user = depot.user;
    if (!user || !user.email) {
      this.logger.error('User email not available, skipping email notification', {
        userId: depot.user?.id,
      });
      return;
    }

    await this.notificationService.sendEmail<EmailRapportParams>(
      {
        to: [{ email: user.email, name: `${user.prenom} ${user.nom}` }],
        subject: `Rapport du dépôt ${masa.numeroDepotVerseau1}`,
        attachments: [
          {
            fileName: `rapport-masa-${depot.id}.pdf`,
            content: pdfBuffer.toString('base64'), // Send as base64 for the queue
          },
        ],
        depotId: depot.id,
        nomOriginalFichier: depot.nomOriginalFichier,
        statut: masa.statut,
        numeroDepotVerseau1: masa.numeroDepotVerseau1,
        prenom: user.prenom,
        nom: user.nom,
      },
      EmailTemplate.RAPPORT,
    );
    this.logger.log('Email sent to déposant', { email: user.email });
    await this.depotGateway.updateDepot(depot.id, {
      step: DepotStep.SEND_EMAIL_TO_DEPOSANT,
    });
  }

  private async sendToAgenceDeEauSftp(depot: DepotModel, _pdfBuffer: Buffer): Promise<void> {
    try {
      if (!depot.path) {
        throw new Error(`No XML file path for depot: ${depot.id}`);
      }
      const _xmlBuffer = await this.s3.download(depot.path);

      const remotePath = `verseau2/${depot.id}`;

      // TODO: Send to different SFTP based on agency configuration
      // // Send XML
      // await this.sftpService.send(xmlBuffer, `${remotePath}/${depot.nomOriginalFichier}`);

      // // Send PDF
      // await this.sftpService.send(pdfBuffer, `${remotePath}/rapport-masa-${depot.id}.pdf`);

      this.logger.log("Files sent to Agence de l'eau SFTP", { remotePath });
    } catch (error) {
      this.logger.error(`Failed to send files to Agence de l'eau SFTP`, {
        depotId: depot.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
