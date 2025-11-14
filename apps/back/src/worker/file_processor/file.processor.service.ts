import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { FichierDeDepot } from '@depot/depot/file/file';
import { S3 } from '@s3/s3';
import { SandreService } from '../referentiel/sandre/sandre.service';
import { AcceptationStatus, SandreValidationResult } from '@worker/referentiel/sandre/sandre';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    @Inject(S3) private readonly s3: S3,
    private readonly sandreService: SandreService,
  ) {
    this.logger.log('FileProcessorService with custom logger', { a: 1 }, 'un autre message', [{ b: 2 }, { c: 3 }]);
  }
  private readonly logger = new LoggerService(FileProcessorService.name);

  async onModuleInit() {
    await this.queueService.work<FichierDeDepot>(QueueName.process_file, async ([job]) => {
      this.logger.log('Downloading file', job.data.filePath);
      const file = await this.s3.download(job.data.filePath);
      this.logger.log('File downloaded, length: ', file.length);

      this.logger.log('Processing jobId', job.id);

      try {
        // Validate file with SANDRE
        this.logger.log('Validating file with SANDRE', { filePath: job.data.filePath });
        const tokenResponse = await this.sandreService.validateFile({
          xml: file,
          xsd: process.env.SANDRE_XSD || 'LABO_DEST;1',
          nomSI: process.env.SANDRE_NOM_SI || 'Verseau2',
          versionSI: process.env.SANDRE_VERSION_SI || '1.0',
        });

        this.logger.log('File uploaded to SANDRE', {
          jeton: tokenResponse.jeton,
          lienAcquittement: tokenResponse.lienAcquittement,
        });

        let validationResult: SandreValidationResult | null = null;
        // Get validation result every 10 seconds for 10 minutes
        for (let i = 0; i < 600; i++) {
          validationResult = await this.sandreService.getValidationResult(tokenResponse.jeton);
          const acceptationStatus = parseInt(validationResult.ACQ.AccuseReception.Acceptation, 10) as AcceptationStatus;
          // Check if validation is complete (not waiting or processing)
          if (
            acceptationStatus === AcceptationStatus.CONFORMANT ||
            acceptationStatus === AcceptationStatus.NON_CONFORMANT
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }

        if (!validationResult) {
          throw new Error('Failed to get validation result from SANDRE');
        }

        const acceptationStatus = parseInt(validationResult.ACQ.AccuseReception.Acceptation, 10) as AcceptationStatus;
        const isConformant = acceptationStatus === AcceptationStatus.CONFORMANT;

        this.logger.log('SANDRE validation result', {
          acceptation: acceptationStatus,
          isConformant,
          jeton: validationResult.ACQ.AccuseReception.Jeton,
          codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
          versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
        });

        if (!isConformant) {
          const errorInfo = validationResult.ACQ.AccuseReception.Erreur
            ? {
                code: validationResult.ACQ.AccuseReception.Erreur.CdErreur,
                message: validationResult.ACQ.AccuseReception.Erreur.DescriptifErreur,
                location: validationResult.ACQ.AccuseReception.Erreur.LocationErreur,
                ligne: validationResult.ACQ.AccuseReception.Erreur.LigneErreur,
                colonne: validationResult.ACQ.AccuseReception.Erreur.ColonneErreur,
                severite: validationResult.ACQ.AccuseReception.Erreur['@attributes'].SeveriteErreur,
              }
            : null;

          this.logger.log('File validation failed', {
            acceptation: acceptationStatus,
            codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
            error: errorInfo,
          });
        }

        this.logger.log('Processing file completed');
      } catch (error) {
        this.logger.error('Processing file failed', error);
        throw error;
      }
    });
  }
}
