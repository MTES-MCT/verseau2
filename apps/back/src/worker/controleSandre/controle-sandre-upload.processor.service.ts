import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from '@s3/s3';
import { AsyncTask } from '@worker/asyncTask';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';

const SANDRE_POLL_INTERVAL_SECONDS = Number(process.env.SANDRE_POLL_INTERVAL_SECONDS ?? '30');

@Injectable()
export class ControleSandreUploadProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly sandreService: SandreService,
    private readonly depotService: DepotService,
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ControleSandreUploadProcessorService.name);
  }

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
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

      // Keep the production delay by default, but allow faster polling in tests.
      this.logger.log(`Depot ${depotId} - Enqueuing poll job`, { jeton: tokenResponse.jeton });
      await this.queueService.send(
        QueueName.controle_sandre_poll,
        { depotId, jeton: tokenResponse.jeton, attemptCount: 0 },
        { startAfter: SANDRE_POLL_INTERVAL_SECONDS },
      );

      this.logger.log(`Depot ${depotId} - Upload job completed`);
    } catch (error) {
      this.logger.error(`Depot ${depotId} - SANDRE upload failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
