import { FichierDeDepot } from '@depot/depot/file/file';
import { Injectable } from '@nestjs/common';
import { FileControl } from '@shared/fileControl';
import { LoggerService } from '@shared/logger/logger.service';
import type { SandreValidationSummary } from '@worker/referentiel/sandre/sandre';
import { SandreService } from '@worker/referentiel/sandre/sandre.service';

@Injectable()
export class ControleSandreService implements FileControl<SandreValidationSummary> {
  constructor(private readonly sandreService: SandreService) {}

  private readonly logger = new LoggerService(ControleSandreService.name);

  async execute(file: Buffer, fichierDeDepot: FichierDeDepot): Promise<SandreValidationSummary> {
    try {
      // Validate file with SANDRE
      this.logger.log('Validating file with SANDRE', { filePath: fichierDeDepot.filePath });
      const validationSummary = await this.sandreService.validateFileAndWait({
        xml: file,
        xsd: process.env.SANDRE_XSD || 'LABO_DEST;1',
        nomSI: process.env.SANDRE_NOM_SI || 'Verseau2',
        versionSI: process.env.SANDRE_VERSION_SI || '1.0',
      });

      this.logger.log('SANDRE validation result', {
        acceptation: validationSummary.acceptationStatus,
        isConformant: validationSummary.isConformant,
        jeton: validationSummary.jeton,
        codeScenario: validationSummary.codeScenario,
        versionScenario: validationSummary.versionScenario,
      });

      if (!validationSummary.isConformant) {
        this.logger.log('File validation failed', {
          acceptation: validationSummary.acceptationStatus,
          codeScenario: validationSummary.codeScenario,
          error: validationSummary.error,
        });
      }

      this.logger.log('Processing file completed');

      return validationSummary;
    } catch (error) {
      this.logger.error('Processing file failed', error);
      throw error;
    }
  }
}
