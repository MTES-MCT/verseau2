import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from '@s3/s3';
import { AsyncTask } from '@worker/asyncTask';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, SandreAcceptationStatus } from '@lib/dossier';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';

@Injectable()
export class ControleSandreUploadProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly sandreService: SandreService,
    private readonly depotService: DepotService,
    @Inject(ReponseSandreGateway) private readonly reponseSandreGateway: ReponseSandreGateway,
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ControleSandreUploadProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    // Check if already processed (idempotency)
    const hasAlreadyBeenProcessed = await this.reponseSandreGateway.findByDepotId(depotId);
    if (hasAlreadyBeenProcessed.length > 0) {
      this.logger.log(`Depot ${depotId} - File has already been uploaded to SANDRE`, { depotId });
      return;
    }

    await this.depotService.update(depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
    });

    try {
      this.logger.log(`Depot ${depotId} - Downloading file for SANDRE upload`, filePath);
      const file = await this.s3.download(filePath);
      this.logger.log(`Depot ${depotId} - File downloaded for SANDRE upload`, {
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });

      this.logger.log(`Depot ${depotId} - Uploading file to SANDRE`);
      const tokenResponse = await this.sandreService.validateFile({
        xml: file,
        xsd: process.env.SANDRE_XSD || 'FCT_ASSAIN;4',
        nomSI: process.env.SANDRE_NOM_SI || 'Verseau2',
        versionSI: process.env.SANDRE_VERSION_SI || '1.0',
      });

      this.logger.log(`Depot ${depotId} - File uploaded to SANDRE`, {
        jeton: tokenResponse.jeton,
      });

      // Create initial reponse_sandre record with WAITING status
      // We'll update this when the poll job gets the final result
      await this.reponseSandreGateway.createReponseSandre({
        depotId,
        jeton: tokenResponse.jeton,
        acceptationStatus: SandreAcceptationStatus.WAITING,
        isConformant: false,
        codeScenario: '', // Will be updated by poll job
        versionScenario: '', // Will be updated by poll job
        errors: [],
        raw: undefined,
      });

      // Enqueue the poll job with startAfter: 30 seconds
      this.logger.log(`Depot ${depotId} - Enqueuing poll job`, { jeton: tokenResponse.jeton });
      await this.queueService.send(
        QueueName.controle_sandre_poll,
        { depotId, jeton: tokenResponse.jeton, attemptCount: 0 },
        { startAfter: 30 }, // Start after 30 seconds
      );

      this.logger.log(`Depot ${depotId} - Upload job completed`);
    } catch (error) {
      this.logger.error(`Depot ${depotId} - SANDRE upload failed`, error);
      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
      });
      throw error;
    }
  }
}
