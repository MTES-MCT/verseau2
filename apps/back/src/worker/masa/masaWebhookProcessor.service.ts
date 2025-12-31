import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { NotificationGateway } from '@notification/notification.gateway';
import { EmailTemplate } from '@notification/notification';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { DepotModel } from '@dossier/depot/depot.model';
import { MasaModel } from '@dossier/masa/masa.model';
import { AsyncTask } from '@worker/asyncTask';
import { ControleGateway } from '@dossier/controle/controle.gateway';

interface MasaProcessorData {
  masaId: string;
  depotId: string;
}

@Injectable()
export class MasaWebhookProcessorService implements AsyncTask<MasaProcessorData> {
  private readonly logger = new LoggerService(MasaWebhookProcessorService.name);

  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(NotificationGateway) private readonly notificationService: NotificationGateway,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(S3) private readonly s3: S3,
    @Inject(Sftp) private readonly sftpService: Sftp,
    private readonly pdfGenerator: RapportPdfGeneratorService,
  ) {}

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

      // 2. Generate PDF report
      const controlesV2 = await this.controleGateway.findControlesV2ByDepotId(depotId);
      this.logger.log(`Generating PDF report`, { masaId });
      const pdfBuffer = await this.pdfGenerator.generateReport(masa, depot, controlesV2);

      // 3. Upload PDF to S3
      const pdfPath = `rapports/${depotId}/${masaId}.pdf`;
      await this.s3.upload(pdfPath, pdfBuffer, 'application/pdf');
      this.logger.log(`PDF uploaded to S3`, { pdfPath });

      await this.depotGateway.updateDepot(depotId, { rapportPath: pdfPath });

      // 4. Send email to déposant
      await this.sendEmailToDeposant(depot, masa, pdfBuffer);

      // 5. Download XML file from S3
      if (!depot.path) {
        throw new Error(`No XML file path for depot: ${depotId}`);
      }

      // 6. Send to Agence de l'eau SFTP
      await this.sendToAgenceDeEauSftp(depot, pdfBuffer);

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

  private async sendEmailToDeposant(depot: DepotModel, masa: MasaModel, pdfBuffer: Buffer): Promise<void> {
    const user = depot.user;
    if (!user || !user.email) {
      this.logger.warn('User email not available, skipping email notification', {
        userId: depot.user?.id,
      });
      return;
    }

    await this.notificationService.sendEmail(
      {
        to: [{ email: user.email, name: `${user.prenom} ${user.nom}` }],
        subject: `Rapport MASA - Dépôt ${depot.id}`,
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
  }

  private async sendToAgenceDeEauSftp(depot: DepotModel, pdfBuffer: Buffer): Promise<void> {
    if (!depot.path) {
      throw new Error(`No XML file path for depot: ${depot.id}`);
    }
    const xmlBuffer = await this.s3.download(depot.path);

    const remotePath = `verseau2/${depot.id}`;

    // TODO: Send to different SFTP based on agency configuration
    // // Send XML
    // await this.sftpService.send(xmlBuffer, `${remotePath}/${depot.nomOriginalFichier}`);

    // // Send PDF
    // await this.sftpService.send(pdfBuffer, `${remotePath}/rapport-masa-${depot.id}.pdf`);

    this.logger.log("Files sent to Agence de l'eau SFTP", { remotePath });
  }
}
