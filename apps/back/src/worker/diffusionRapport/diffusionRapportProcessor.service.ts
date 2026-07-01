import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { NotificationGateway } from '@notification/notification.gateway';
import { EmailTemplate, EmailRapportParams } from '@notification/notification';
import { S3 } from '@infra/s3/s3';
import { SftpAgency } from '@infra/sftp/sftpAgency';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { DepotModel } from '@dossier/depot/depot.model';
import { MasaModel } from '@dossier/masa/masa.model';
import { DepotStep } from '@lib/dossier';
import { AsyncTask } from '@worker/asyncTask';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { MasaProvider } from '@masa/masa.provider';
import { RapportDestinataire } from '@queue/queue';
import type { DiffusionRapportJobData } from '@queue/queue';
import { Zip } from '@shared/zip/zip';
import { buildAgenceEauSftpRemotePaths } from './agenceEauSftpNomenclature';

@Injectable()
export class DiffusionRapportProcessorService implements AsyncTask<DiffusionRapportJobData> {
  constructor(
    @Inject(MasaGateway) private readonly masaGateway: MasaGateway,
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(NotificationGateway) private readonly notificationService: NotificationGateway,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
    @Inject(ReponseSandreGateway) private readonly reponseSandreGateway: ReponseSandreGateway,
    @Inject(S3) private readonly s3: S3,
    @Inject(SftpAgency) private readonly sftpAgency: SftpAgency,
    @Inject(Zip) private readonly zip: Zip,
    private readonly masaProvider: MasaProvider,
    private readonly pdfGenerator: RapportPdfGeneratorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DiffusionRapportProcessorService.name);
  }

  async process(data: DiffusionRapportJobData): Promise<void> {
    const { depotId, masaId, destinataires } = data;
    this.logger.log(`Processing diffusion rapport`, { depotId, masaId, destinataires });

    try {
      const depot = await this.depotGateway.findDepotByIdWithUser(depotId);
      if (!depot) {
        throw new Error(`Depot not found: ${depotId}`);
      }

      if (!depot.path) {
        throw new Error(`No XML file path for depot: ${depotId}`);
      }

      let masa: MasaModel | null | undefined;
      if (masaId) {
        masa = await this.masaGateway.findById(masaId);
        if (!masa) {
          throw new Error(`MASA not found: ${masaId}`);
        }
      }

      // 1. Generate PDF report
      const controlesV2 = await this.controleGateway.findControlesV2ByDepotId(depotId);
      const reponsesSandre = await this.reponseSandreGateway.findByDepotId(depotId);
      this.logger.log(`Generating PDF report`, { depotId, masaId });
      const pdfBuffer = await this.pdfGenerator.generateReport(depot, controlesV2, masa ?? undefined, reponsesSandre);

      // 2. Upload PDF to S3
      const pdfPath = `rapports/${depotId}/rapport.pdf`;
      await this.s3.upload(pdfPath, pdfBuffer, 'application/pdf');
      this.logger.log(`PDF uploaded to S3`, { pdfPath });

      await this.depotGateway.updateDepot(depotId, { rapportPath: pdfPath });

      // 3. Send to Agence de l'eau SFTP
      if (destinataires.includes(RapportDestinataire.AGENCE_EAU)) {
        await this.sendToAgenceDeEauSftp(depot, pdfBuffer, masa ?? undefined);
      }

      // 4. Send email to déposant
      if (destinataires.includes(RapportDestinataire.DEPOSANT)) {
        await this.sendEmailToDeposant(depot, pdfBuffer, masa ?? undefined);
      }

      this.logger.log(`Diffusion rapport processing completed`, { depotId, masaId, destinataires });
    } catch (error) {
      this.logger.error(`Failed to process diffusion rapport`, {
        depotId,
        masaId,
        destinataires,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async sendEmailToDeposant(depot: DepotModel, pdfBuffer: Buffer, masa?: MasaModel): Promise<void> {
    const user = depot.user;
    if (!user || !user.email) {
      this.logger.error('User email not available, skipping email notification', {
        userId: depot.user?.id,
      });
      return;
    }

    const subject = masa?.numeroDepotVerseau1
      ? `Rapport du dépôt ${masa.numeroDepotVerseau1}`
      : `Rapport de rejet du dépôt`;

    await this.notificationService.sendEmail<EmailRapportParams>(
      {
        to: [{ email: user.email, name: `${user.prenom} ${user.nom}` }],
        subject,
        attachments: [
          {
            fileName: `rapport-${depot.id}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
        depotId: depot.id,
        nomOriginalFichier: depot.nomOriginalFichier,
        ...(masa && {
          statut: masa.statut,
          numeroDepotVerseau1: masa.numeroDepotVerseau1,
        }),
        prenom: user.prenom,
        nom: user.nom,
      },
      EmailTemplate.RAPPORT,
    );
    this.logger.log('Job email added - to déposant', { email: user.email });
    await this.depotGateway.updateDepot(depot.id, {
      step: DepotStep.SEND_EMAIL_TO_DEPOSANT,
    });
  }

  private async sendToAgenceDeEauSftp(depot: DepotModel, pdfBuffer: Buffer, masa?: MasaModel): Promise<void> {
    try {
      if (!depot.path) {
        throw new Error(`No XML file path for depot: ${depot.id}`);
      }

      const xmlBuffer = await this.s3.download(depot.path);
      const parsed = await parseScenarioAssainissementXml(xmlBuffer.toString('utf8'));
      const ouvrageDepollutionCode = parsed.ouvrages
        .map((ouvrage) => ouvrage.cdOuvrageDepollution?.trim())
        .find((code): code is string => Boolean(code));

      if (!ouvrageDepollutionCode) {
        this.logger.warn("No codeOuvrageDepollution found in XML, skipping Agence de l'eau SFTP upload", {
          depotId: depot.id,
          path: depot.path,
        });
        return;
      }

      const agenceEauNom = await this.masaProvider.findAgenceEauNomBySteuCode(ouvrageDepollutionCode);
      if (!agenceEauNom) {
        this.logger.warn("No agence de l'eau code found for ouvrage, skipping Agence de l'eau SFTP upload", {
          depotId: depot.id,
          ouvrageDepollutionCode,
        });
        return;
      }

      const remotePaths = buildAgenceEauSftpRemotePaths(
        agenceEauNom,
        depot.nomOriginalFichier,
        masa?.numeroDepotVerseau1,
      );
      if (!remotePaths) {
        this.logger.warn("No SFTP filename rule for agence de l'eau, skipping upload", {
          depotId: depot.id,
          ouvrageDepollutionCode,
          agenceEauNom,
          numeroDepotVerseau1: masa?.numeroDepotVerseau1,
        });
        return;
      }

      if (!this.sftpAgency.hasClient(agenceEauNom)) {
        this.logger.warn("No configured SFTP client for agence de l'eau, skipping upload", {
          depotId: depot.id,
          ouvrageDepollutionCode,
          agenceEauNom,
          configuredAgencies: this.sftpAgency.getConfiguredAgencies(),
        });
        return;
      }

      const sftpClient = this.sftpAgency.getClient(agenceEauNom);

      // SftpAgency/SftpService prefixes the relative remote path using the agency configuration.

      const zipBuffer = this.zip.createArchive({
        [depot.nomOriginalFichier]: xmlBuffer,
        [`rapport-masa-${depot.id}.pdf`]: pdfBuffer,
      });
      await sftpClient.send(zipBuffer, remotePaths.zipPath);
      await sftpClient.send(Buffer.alloc(0), remotePaths.ackPath);

      this.logger.log("Files sent to Agence de l'eau SFTP", {
        depotId: depot.id,
        ouvrageDepollutionCode,
        agenceEauNom,
        zipPath: remotePaths.zipPath,
        ackPath: remotePaths.ackPath,
      });
    } catch (error) {
      this.logger.error(`Failed to send files to Agence de l'eau SFTP`, {
        depotId: depot.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
